import gsap from "gsap";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll<HTMLDialogElement>("[data-certificate-dialog]").forEach((dialog) => {
  const image = dialog.querySelector<HTMLImageElement>("img");
  const back = dialog.querySelector<HTMLButtonElement>("[data-certificate-back]");
  if (!image || !back) return;

  let motion: gsap.core.Timeline | undefined;
  let revision = 0;
  let closing = false;
  let ready = false;
  let origin = { x: 0, y: 0, width: 0, height: 0, rotation: 0 };

  const originTransform = () => {
    const bounds = dialog.getBoundingClientRect();
    return {
      x: origin.x - (bounds.left + bounds.width / 2),
      y: origin.y - (bounds.top + bounds.height / 2),
      scale: gsap.utils.clamp(.12, .75, Math.min(origin.width / image.offsetWidth, origin.height / image.offsetHeight)),
      rotation: origin.rotation,
    };
  };

  const close = () => {
    if (!dialog.open || closing) return;
    closing = true;
    revision++;
    motion?.kill();
    if (reducedMotion.matches || !ready) {
      dialog.close();
      return;
    }
    motion = gsap.timeline({ defaults: { ease: "power2.in" }, onComplete: () => dialog.close() });
    motion
      .to(image, { ...originTransform(), opacity: 0, duration: .34 }, 0)
      .to(back, { opacity: 0, duration: .18 }, 0)
      .to(dialog, { "--certificate-shade": 0, duration: .29 }, .04);
  };

  dialog.addEventListener("portfolio:dialog-open", async (event) => {
    const opener = (event as CustomEvent<HTMLElement>).detail;
    const preview = opener.dataset.previewOrigin?.split(",").map(Number);
    delete opener.dataset.previewOrigin;
    const row = opener.getBoundingClientRect();
    origin = preview?.length === 4
      ? { x: preview[0], y: preview[1], width: preview[2], height: preview[3], rotation: 5 }
      : { x: row.left + row.width / 2, y: row.top + row.height / 2, width: row.width, height: Math.max(64, row.height), rotation: 0 };
    const opening = ++revision;
    closing = false;
    ready = false;
    motion?.kill();
    gsap.set([image, back], { clearProps: "transform,opacity" });
    gsap.set(dialog, { clearProps: "--certificate-shade" });

    if (reducedMotion.matches) return;

    gsap.set(image, { opacity: 0 });
    gsap.set(dialog, { "--certificate-shade": .38 });
    if (!image.complete || !image.naturalWidth) {
      image.loading = "eager";
      try { await image.decode(); } catch {
        if (opening === revision) {
          gsap.set(image, { clearProps: "opacity" });
          gsap.set(dialog, { clearProps: "--certificate-shade" });
        }
        return;
      }
    }
    if (!dialog.open || opening !== revision) return;

    ready = true;
    motion = gsap.timeline({ defaults: { ease: "power3.out" } });
    motion
      .to(dialog, { "--certificate-shade": .94, duration: .5 }, 0)
      .fromTo(image, { ...originTransform(), opacity: .75 }, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: .55 }, 0);
  });

  back.addEventListener("click", close);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    revision++;
    motion?.kill();
    gsap.set([image, back], { clearProps: "transform,opacity" });
    gsap.set(dialog, { clearProps: "--certificate-shade" });
    closing = false;
    ready = false;
  });
});
