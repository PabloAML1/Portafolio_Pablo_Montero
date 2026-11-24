import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initProjectCovers } from "./project-covers";

export function initProjectRail(viewport: HTMLElement, media: ReturnType<typeof gsap.matchMedia>, interruptScroll: () => void, signal: AbortSignal) {
  const section = viewport.querySelector<HTMLElement>("[data-projects]");
  const stage = section?.querySelector<HTMLElement>("[data-project-stage]");
  const controls = section?.querySelector<HTMLElement>("[data-project-controls]");
  const previous = controls?.querySelector<HTMLAnchorElement>("[data-project-prev]");
  const next = controls?.querySelector<HTMLAnchorElement>("[data-project-next]");
  const count = controls?.querySelector<HTMLElement>("[data-project-count]");
  if (!section || !stage || !controls || !previous || !next || !count) return;

  const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-project-card]"));
  const stops = Array.from(section.querySelectorAll<HTMLElement>("[data-project-stop]"));
  const last = cards.length - 1;
  if (last < 1) return;

  controls.hidden = false;
  const resetCovers = initProjectCovers(stage, viewport, stops, interruptScroll, signal);
  const scenes = cards.map((card) => ({
    card,
    art: card.querySelector("[data-project-art]"),
    caption: card.querySelector("[data-project-caption]"),
  }));
  const clamp = gsap.utils.clamp(0, 1);
  const ease = gsap.parseEase("power2.inOut");
  let active = -1;

  const update = (progress: number, animate: boolean) => {
    const position = progress * last;
    const outgoing = Math.floor(position);
    const incoming = Math.min(last, outgoing + 1);
    const mix = animate ? clamp((position - outgoing - .18) / .64) : 0;
    const index = Math.round(position);
    const reveal = ease(mix);

    scenes.forEach(({ card, art, caption }, slot) => {
      const under = animate && slot === outgoing && mix < 1;
      const over = animate && slot === incoming && mix > 0;
      card.style.visibility = (animate ? under || over : slot === index) ? "visible" : "hidden";
      card.style.clipPath = over && mix < 1 ? `inset(0 ${(1 - reveal) * 100}% 0 0)` : "";
      if (art) gsap.set(art, { xPercent: under ? 8 * reveal : over ? -9 * (1 - reveal) : 0 });
      if (caption) {
        const opacity = under ? 1 - clamp(mix * 2.2) : over ? clamp((mix - .42) / .42) : 1;
        gsap.set(caption, { opacity, y: (1 - opacity) * 16 });
      }
    });

    if (index === active) return;
    if (cards[active]?.contains(document.activeElement)) {
      const heading = section.querySelector<HTMLElement>("#projects-title");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
    active = index;
    cards.forEach((card, slot) => { card.inert = slot !== active; });
    stage.style.setProperty("--project-progress", String((active + 1) / cards.length));
    const updateArrow = (arrow: HTMLAnchorElement, slot: number) => {
      const enabled = slot >= 0 && slot <= last;
      arrow.setAttribute("aria-disabled", String(!enabled));
      arrow.href = `#${stops[enabled ? slot : active].id}`;
    };
    updateArrow(previous, active - 1);
    updateArrow(next, active + 1);
    count.textContent = `${String(active + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
  };

  media.add({ animate: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, ({ conditions }) => {
    const animate = Boolean(conditions?.animate);
    const sync = (trigger: ScrollTrigger) => update(trigger.progress, animate);
    const trigger = ScrollTrigger.create({
      scroller: viewport,
      trigger: section,
      horizontal: true,
      start: "left left",
      end: () => `+=${viewport.clientWidth * last}`,
      onUpdate: sync,
      onRefresh: sync,
    });
    sync(trigger);

    if (animate) {
      const header = stage.querySelector("[data-project-header]");
      gsap.fromTo(header, { y: 12, opacity: .4 }, {
        y: 0, opacity: 1, ease: "power2.out",
        scrollTrigger: { scroller: viewport, trigger: section, horizontal: true, start: "left 70%", end: "left 5%", scrub: true },
      });
    }
  });

  return () => {
    resetCovers?.();
    controls.hidden = true;
    stage.style.removeProperty("--project-progress");
    scenes.forEach(({ card, art, caption }) => {
      card.inert = false;
      card.style.removeProperty("visibility");
      card.style.removeProperty("clip-path");
      gsap.set(art, { clearProps: "transform" });
      gsap.set(caption, { clearProps: "opacity,transform" });
    });
  };
}
