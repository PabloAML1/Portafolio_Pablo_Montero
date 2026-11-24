import gsap from "gsap";

export function initProjectCovers(
  stage: HTMLElement,
  viewport: HTMLElement,
  stops: HTMLElement[],
  interruptScroll: () => void,
  signal: AbortSignal,
) {
  const cursor = stage.querySelector<HTMLElement>("[data-project-cursor]");
  if (!cursor) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const movePointerX = gsap.quickTo(stage, "--project-pointer-x", { duration: .24, ease: "power3.out" });
  const movePointerY = gsap.quickTo(stage, "--project-pointer-y", { duration: .24, ease: "power3.out" });
  const panX = gsap.quickTo(stage, "--project-pan-x", { duration: .65, ease: "power3.out" });
  const panY = gsap.quickTo(stage, "--project-pan-y", { duration: .65, ease: "power3.out" });
  let drag: { id: number; x: number; y: number; left: number; index: number; moved: boolean } | null = null;
  let wasDragging = false;

  const resetPointer = () => {
    delete stage.dataset.projectHover;
    panX(0);
    panY(0);
  };

  stage.addEventListener("pointermove", (event) => {
    if (drag?.id === event.pointerId) {
      const distance = drag.y - event.clientY;
      if (!drag.moved && Math.abs(event.clientX - drag.x) > 10 && Math.abs(event.clientX - drag.x) > Math.abs(distance)) {
        drag = null;
        wasDragging = true;
      } else if (!drag.moved && Math.abs(distance) >= 8) {
        drag.moved = true;
        interruptScroll();
        stage.setPointerCapture(event.pointerId);
        viewport.dataset.navigating = "";
        stage.dataset.projectDragging = "";
        resetPointer();
      }
      if (drag?.moved) {
        const width = viewport.clientWidth;
        const offset = gsap.utils.clamp(-width, width, distance * width / (stage.clientHeight * .62));
        viewport.scrollLeft = drag.left + offset;
        return;
      }
    }

    if (event.pointerType !== "mouse") return;
    const cover = (event.target as Element).closest("[data-project-preview]");
    if (!cover || reduced.matches) {
      if (stage.hasAttribute("data-project-hover")) resetPointer();
      return;
    }
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (!stage.hasAttribute("data-project-hover")) {
      stage.style.setProperty("--project-pointer-x", `${x}px`);
      stage.style.setProperty("--project-pointer-y", `${y}px`);
      movePointerX(x, x);
      movePointerY(y, y);
      cursor.hidden = false;
      stage.dataset.projectHover = "";
    } else {
      movePointerX(x);
      movePointerY(y);
    }
    panX((.5 - x / rect.width) * 28);
    panY((.5 - y / rect.height) * 22);
  }, { signal });

  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    wasDragging = false;
    const target = event.target as Element;
    if (!target.closest("[data-project-track]") || target.closest("button:not([data-project-preview])")) return;
    const first = stops[0].getBoundingClientRect().left;
    const index = (viewport.getBoundingClientRect().left - first) / viewport.clientWidth;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, index, moved: false };
  }, { signal });

  const finishDrag = (event: PointerEvent) => {
    if (drag?.id !== event.pointerId) return;
    const { moved, y, left, index } = drag;
    drag = null;
    delete stage.dataset.projectDragging;
    if (!moved) return;
    wasDragging = true;
    const width = viewport.clientWidth;
    const delta = event.type === "pointercancel" ? 0 : y - event.clientY;
    const slot = Math.round(index) + (Math.abs(delta) > 40 ? Math.sign(delta) : 0);
    const destination = left + (slot - index) * width;
    const restoreSnap = () => { delete viewport.dataset.navigating; };
    if (reduced.matches) {
      viewport.scrollLeft = destination;
      restoreSnap();
    } else {
      gsap.to(viewport, { scrollLeft: destination, duration: .48, ease: "power3.out", onComplete: restoreSnap, onInterrupt: restoreSnap });
    }
  };

  window.addEventListener("pointerup", finishDrag, { signal });
  window.addEventListener("pointercancel", finishDrag, { signal });
  stage.addEventListener("pointerleave", resetPointer, { signal });
  stage.addEventListener("click", (event) => {
    if (!wasDragging || !event.detail) return;
    wasDragging = false;
    event.stopPropagation();
    event.preventDefault();
  }, { capture: true, signal });
  stage.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLElement) || !event.target.matches("[data-project-track]")) return;
    stage.querySelector<HTMLButtonElement>("[data-project-card]:not([inert]) [data-project-preview]")?.click();
  }, { signal });
  reduced.addEventListener("change", resetPointer, { signal });
  return () => {
    if (drag && stage.hasPointerCapture(drag.id)) stage.releasePointerCapture(drag.id);
    [movePointerX, movePointerY, panX, panY].forEach(({ tween }) => tween.kill());
    ["--project-pointer-x", "--project-pointer-y", "--project-pan-x", "--project-pan-y"].forEach((property) => stage.style.removeProperty(property));
    cursor.hidden = true;
    delete stage.dataset.projectHover;
    delete stage.dataset.projectDragging;
  };
}
