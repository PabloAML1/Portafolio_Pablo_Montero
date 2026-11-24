import { createPortraitFluid, type Point, type Stroke } from "./portrait-fluid-renderer";

const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
const CENTER: Point = [.5, .5];
const STEP_MS = 1000 / 60;
const FLUID_TAIL_MS = 2200;

export function mountPortrait(frame: HTMLElement, photo: HTMLImageElement, canvas: HTMLCanvasElement, toggle: HTMLButtonElement, marbleSource: string) {
  const slide = frame.closest<HTMLElement>("[data-hero]");
  const viewport = frame.closest("[data-portfolio-viewport]");
  const listeners = new AbortController();
  const { signal } = listeners;
  const sizeObserver = new ResizeObserver(() => {
    if (active() && fluid) drawCurrent();
  });
  sizeObserver.observe(frame);

  let fluid: ReturnType<typeof createPortraitFluid> = null;
  let load: Promise<HTMLImageElement> | undefined;
  let loading = false;
  let failed = false;
  let inView = false;
  let frameId = 0;
  let idleTimer = 0;
  let idleStart: number | null = null;
  let hasInput = false;
  let previousInput: Point | null = null;
  let press: Point | null = null;
  let dragged = false;
  let pointer: Point = CENTER;
  let reveal = 0;
  let target = 0;
  let timestamp = 0;
  let accumulator = 0;
  let fluidUntil = 0;
  const strokes: Stroke[] = [];

  function active() {
    return inView && motion.matches && !document.hidden && !slide?.inert && !failed && !signal.aborted;
  }

  function showCanvas(visible: boolean) {
    frame.toggleAttribute("data-fluid-ready", visible);
    canvas.hidden = !visible;
    toggle.hidden = !visible;
  }

  function stop() {
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(idleTimer);
    idleTimer = frameId = 0;
    idleStart = null;
    previousInput = null;
    press = null;
    timestamp = accumulator = fluidUntil = 0;
    strokes.length = 0;
  }

  function fallback() {
    stop();
    failed = true;
    showCanvas(false);
    fluid?.dispose();
    fluid = null;
  }

  function drawCurrent() {
    try {
      if (!fluid || !frame.clientWidth || !frame.clientHeight) return;
      fluid.resize(frame.clientWidth, frame.clientHeight);
      fluid.render(pointer, reveal);
    } catch {
      fallback();
    }
  }

  function enqueue(point: Point, now: number) {
    pointer = point;
    if (previousInput) {
      const dx = point[0] - previousInput[0];
      const dy = point[1] - previousInput[1];
      if (dx || dy) {
        const segments = Math.min(8, Math.ceil(Math.hypot(dx, dy) / .035));
        const force: Point = [dx * 50 / segments, dy * 50 / segments];
        for (let i = 1; i <= segments; i++) {
          if (strokes.length === 8) strokes.shift();
          strokes.push({ point: [previousInput[0] + dx * i / segments, previousInput[1] + dy * i / segments], force });
        }
        fluidUntil = now + FLUID_TAIL_MS;
      }
    }
    previousInput = point;
  }

  function sweep(now: number) {
    if (idleStart === null) return;
    const elapsed = (now - idleStart) / 1000;
    if (elapsed >= 9.5) {
      idleStart = null;
      previousInput = null;
      return;
    }
    const phase = elapsed < 2.5 ? elapsed / 2.5 : elapsed < 4 ? 1 : elapsed < 6.5 ? 1 - (elapsed - 4) / 2.5 : 0;
    const eased = (1 - Math.cos(phase * Math.PI)) * .5;
    const angle = eased * Math.PI * 2;
    enqueue([.52 + Math.sin(angle) * .21, .55 + Math.sin(angle * 2) * .095], now);
  }

  function run(now: number) {
    frameId = 0;
    if (!active() || !fluid) return;
    const elapsed = timestamp ? Math.min(68, now - timestamp) : STEP_MS;
    timestamp = now;
    accumulator += elapsed;
    sweep(now);

    if (fluidUntil && now >= fluidUntil) {
      fluid.clear();
      fluidUntil = 0;
      pointer = CENTER;
    }
    if (fluidUntil) {
      for (; accumulator >= STEP_MS; accumulator -= STEP_MS) fluid.step(strokes.splice(0));
    } else {
      accumulator = 0;
    }

    reveal += (target - reveal) * (1 - Math.exp(-elapsed / 98));
    if (Math.abs(reveal - target) < .001) reveal = target;
    fluid.render(pointer, reveal);
    if (idleStart !== null || fluidUntil || reveal !== target) wake();
    else timestamp = accumulator = 0;
  }

  function wake() {
    if (!frameId && fluid && active()) frameId = window.requestAnimationFrame(run);
  }

  function scheduleIdle() {
    if (hasInput || idleTimer || idleStart !== null) return;
    idleTimer = window.setTimeout(() => {
      idleTimer = 0;
      if (!active() || !fluid || hasInput) return;
      idleStart = performance.now();
      previousInput = null;
      wake();
    }, 2000);
  }

  async function mount() {
    if (loading) return;
    loading = true;
    if (!load) {
      const marble = new Image();
      marble.src = marbleSource;
      load = Promise.all([photo.decode(), marble.decode()]).then(() => marble);
    }

    try {
      const image = await load;
      if (!active()) return;
      fluid = createPortraitFluid(canvas, photo, image);
      if (!fluid) {
        fallback();
        return;
      }
      drawCurrent();
      if (!fluid) return;
      showCanvas(true);
      scheduleIdle();
    } catch {
      fallback();
    } finally {
      loading = false;
    }
  }

  function sync() {
    if (!active()) {
      stop();
      if (!motion.matches) {
        pointer = CENTER;
        reveal = target = 0;
        toggle.setAttribute("aria-pressed", "false");
        showCanvas(false);
      }
      return;
    }
    if (!fluid) {
      void mount();
      return;
    }
    fluid.clear();
    drawCurrent();
    if (!fluid) return;
    showCanvas(true);
    scheduleIdle();
    if (reveal !== target) wake();
  }

  function stopIdle() {
    if (!hasInput) previousInput = null;
    hasInput = true;
    idleStart = null;
    window.clearTimeout(idleTimer);
    idleTimer = 0;
  }

  frame.addEventListener("pointermove", (event) => {
    if (!active() || !fluid) return;
    if (press && Math.hypot(event.clientX - press[0], event.clientY - press[1]) > 8) dragged = true;
    stopIdle();
    const bounds = frame.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    enqueue([
      Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      Math.max(0, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height)),
    ], performance.now());
    wake();
  }, { signal, passive: true });

  const endStroke = () => { previousInput = null; };
  frame.addEventListener("pointerleave", endStroke, { signal, passive: true });
  frame.addEventListener("pointercancel", () => { press = null; endStroke(); }, { signal, passive: true });
  frame.addEventListener("pointerup", () => { press = null; }, { signal, passive: true });
  frame.addEventListener("pointerdown", (event) => {
    press = [event.clientX, event.clientY];
    dragged = false;
    stopIdle();
  }, { signal, passive: true });
  toggle.addEventListener("click", (event) => {
    if (event.detail && dragged) return;
    if (!active() || !fluid) return;
    stopIdle();
    target = 1 - target;
    toggle.setAttribute("aria-pressed", String(target === 1));
    wake();
  }, { signal });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fallback();
  }, { signal });
  canvas.addEventListener("webglcontextrestored", () => {
    failed = false;
    sync();
  }, { signal });

  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }, { root: viewport, threshold: .03 });
  intersection.observe(frame);
  const interaction = new MutationObserver(sync);
  if (slide) interaction.observe(slide, { attributes: true, attributeFilter: ["inert"] });

  document.addEventListener("visibilitychange", sync, { signal });
  motion.addEventListener("change", sync, { signal });
  window.addEventListener("pageshow", sync, { signal });
  const dispose = () => {
    stop();
    listeners.abort();
    intersection.disconnect();
    interaction.disconnect();
    sizeObserver.disconnect();
    fluid?.dispose();
    fluid = null;
    showCanvas(false);
  };
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) stop();
    else dispose();
  }, { signal });
  return dispose;
}
