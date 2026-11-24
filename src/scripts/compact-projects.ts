export function initCompactProjects(viewport: HTMLElement) {
  const section = viewport.querySelector<HTMLElement>("[data-projects]");
  const track = section?.querySelector<HTMLElement>("[data-project-track]");
  const controls = section?.querySelector<HTMLElement>("[data-project-controls]");
  const previous = controls?.querySelector<HTMLAnchorElement>("[data-project-prev]");
  const next = controls?.querySelector<HTMLAnchorElement>("[data-project-next]");
  const count = controls?.querySelector<HTMLElement>("[data-project-count]");
  if (!section || !track || !controls || !previous || !next || !count) return;

  const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-project-card]"));
  const stops = Array.from(section.querySelectorAll<HTMLElement>("[data-project-stop]"));
  if (cards.length < 2) return;

  const listeners = new AbortController();
  const { signal } = listeners;
  let active = 0;
  let touch: { id: number; x: number; y: number } | undefined;
  let suppressClick = false;

  const show = (index: number) => {
    active = Math.max(0, Math.min(cards.length - 1, index));
    cards.forEach((card, slot) => { card.hidden = slot !== active; });
    previous.setAttribute("aria-disabled", String(active === 0));
    next.setAttribute("aria-disabled", String(active === cards.length - 1));
    previous.href = `#${stops[Math.max(0, active - 1)].id}`;
    next.href = `#${stops[Math.min(cards.length - 1, active + 1)].id}`;
    count.textContent = `${String(active + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
  };

  controls.addEventListener("click", (event) => {
    const arrow = event.target instanceof Element && event.target.closest("a");
    if (!arrow) return;
    event.preventDefault();
    show(active + (arrow === previous ? -1 : 1));
  }, { signal });

  track.addEventListener("pointerdown", (event) => {
    suppressClick = false;
    if (event.isPrimary && event.pointerType !== "mouse") touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { passive: true, signal });
  track.addEventListener("pointercancel", () => { touch = undefined; }, { passive: true, signal });
  track.addEventListener("pointerup", (event) => {
    if (touch?.id !== event.pointerId) return;
    const dx = event.clientX - touch.x;
    const dy = event.clientY - touch.y;
    touch = undefined;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    suppressClick = true;
    show(active - Math.sign(dx));
  }, { passive: true, signal });
  track.addEventListener("click", (event) => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.stopPropagation();
  }, { capture: true, signal });

  const selectHash = () => {
    const slot = stops.findIndex((stop) => `#${stop.id}` === location.hash);
    if (slot === -1) return;
    show(slot);
    section.scrollIntoView({ block: "start" });
  };
  controls.hidden = false;
  track.dataset.compactGallery = "";
  show(0);
  selectHash();
  window.addEventListener("hashchange", selectHash, { signal });

  return () => {
    listeners.abort();
    delete track.dataset.compactGallery;
    cards.forEach((card) => { card.hidden = false; });
    controls.hidden = true;
  };
}
