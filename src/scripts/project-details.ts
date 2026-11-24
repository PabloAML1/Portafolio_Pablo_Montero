import gsap from "gsap";
import { getTranslation } from "./i18n";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll<HTMLDialogElement>("[data-case-dialog]").forEach((dialog) => {
  const copy = dialog.querySelector("[data-case-copy]");
  const frame = dialog.querySelector<HTMLElement>("[data-case-images]");
  const slides = Array.from(dialog.querySelectorAll<HTMLImageElement>("[data-case-slide]"));
  const counter = dialog.querySelector("[data-case-count]");
  const playback = dialog.querySelector<HTMLButtonElement>("[data-case-play]");
  const icon = playback?.querySelector("[data-case-icon]");
  if (!copy || !frame || !slides.length) return;

  let visible = 0;
  let playing = false;
  let closing = false;
  let timeout: number | undefined;
  let motion: gsap.core.Timeline | undefined;
  let thumbnail: HTMLElement | null = null;

  const schedule = () => {
    window.clearTimeout(timeout);
    if (!dialog.open || closing || !playing || document.hidden) return;
    timeout = window.setTimeout(() => {
      showSlide(1);
      schedule();
    }, 3600);
  };

  const setPlayback = (enabled: boolean) => {
    playing = enabled;
    if (playback) {
      const key = enabled ? "gallery.pause" : "gallery.play";
      playback.dataset.i18nAria = key;
      playback.setAttribute("aria-label", getTranslation(key));
    }
    if (icon) icon.textContent = enabled ? "Ⅱ" : "▶";
    counter?.setAttribute("aria-live", enabled ? "off" : "polite");
    schedule();
  };

  const select = (index: number) => {
    slides.forEach((slide, slot) => slide.setAttribute("aria-hidden", String(slot !== index)));
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
    visible = index;
  };

  const showSlide = (direction: number) => {
    if (slides.length < 2) return;
    const old = slides[visible];
    const next = (visible + direction + slides.length) % slides.length;
    const incoming = slides[next];

    gsap.killTweensOf(slides);
    gsap.set(slides.filter((slide) => slide !== old && slide !== incoming), { autoAlpha: 0, xPercent: 0 });
    select(next);

    if (reducedMotion.matches) {
      gsap.set(old, { autoAlpha: 0, xPercent: 0 });
      gsap.set(incoming, { autoAlpha: 1, xPercent: 0 });
      return;
    }
    gsap.to(old, { xPercent: -direction * 22, autoAlpha: 0, duration: .45, ease: "power2.inOut" });
    gsap.fromTo(incoming, { xPercent: direction * 22, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: .5, ease: "power2.out" });
  };

  const imageTransform = () => {
    const source = thumbnail?.getBoundingClientRect();
    const target = frame.getBoundingClientRect();
    if (!source?.width || !source.height || !target.width || !target.height) return { x: 0, y: 16, scaleX: .94, scaleY: .94 };
    return {
      x: source.left + source.width / 2 - target.left - target.width / 2,
      y: source.top + source.height / 2 - target.top - target.height / 2,
      scaleX: source.width / target.width,
      scaleY: source.height / target.height,
    };
  };

  const close = () => {
    if (closing || !dialog.open) return;
    closing = true;
    setPlayback(false);
    motion?.kill();
    if (reducedMotion.matches) {
      dialog.close();
      return;
    }

    const transform = gsap.getProperty(frame, "scaleX");
    const destination = transform === 1 ? imageTransform() : { x: 0, y: 12, scaleX: .96, scaleY: .96 };
    motion = gsap.timeline({ defaults: { ease: "power2.in" }, onComplete: () => dialog.close() });
    motion
      .to(copy, { autoAlpha: 0, x: -22, duration: .21 }, 0)
      .to(frame, { ...destination, autoAlpha: 0, duration: .38 }, 0)
      .to(dialog, { "--case-shade": 0, duration: .34 }, .07);
  };

  dialog.addEventListener("portfolio:dialog-open", (event) => {
    const opener = (event as CustomEvent<HTMLElement>).detail;
    thumbnail = opener.matches("[data-project-preview]") ? opener : null;
    if (!thumbnail && opener.closest("[data-project-card]")) {
      const covers = Array.from(opener.closest("[data-projects]")?.querySelectorAll<HTMLElement>("[data-project-preview]:not([inert])") ?? []);
      thumbnail = covers.find((cover) => cover.dataset.dialogOpen === dialog.id) ?? null;
    }
    dialog.scrollTop = 0;
    select(0);
    gsap.set(slides, { autoAlpha: 0, xPercent: 0 });
    gsap.set(slides[0], { autoAlpha: 1 });
    setPlayback(slides.length > 1 && !reducedMotion.matches);
    if (reducedMotion.matches) return;

    motion = gsap.timeline({ defaults: { ease: "power3.out" } });
    motion
      .fromTo(dialog, { "--case-shade": 0 }, { "--case-shade": .96, duration: .55 }, 0)
      .fromTo(frame, { ...imageTransform(), autoAlpha: .6 }, { x: 0, y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, duration: .59 }, 0)
      .fromTo(copy, { x: -30, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .48 }, .12);
  });

  dialog.querySelector("[data-case-close]")?.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("close", () => {
    setPlayback(false);
    motion?.kill();
    gsap.killTweensOf(slides);
    gsap.set([copy, frame], { clearProps: "transform,opacity,visibility" });
    gsap.set(dialog, { clearProps: "--case-shade" });
    thumbnail = null;
    closing = false;
  });

  const manualStep = (direction: number) => {
    if (closing) return;
    setPlayback(false);
    showSlide(direction);
  };

  playback?.addEventListener("click", () => {
    if (!closing) setPlayback(!playing);
  });
  dialog.querySelectorAll<HTMLButtonElement>("[data-case-step]").forEach((button) => {
    button.addEventListener("click", () => manualStep(Number(button.dataset.caseStep)));
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    manualStep(event.key === "ArrowLeft" ? -1 : 1);
  });
  document.addEventListener("visibilitychange", schedule);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches && dialog.open) setPlayback(false);
  });
});
