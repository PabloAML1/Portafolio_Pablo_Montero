import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initProjectRail } from "./project-rail";
import { initCompactProjects } from "./compact-projects";
import { desktopPresentation } from "./portfolio-layout";

gsap.registerPlugin(ScrollTrigger);
const viewport = document.querySelector<HTMLElement>("[data-portfolio-viewport]");

function mountDesktop(viewport: HTMLElement, activeSection?: HTMLElement | null) {
  const overture = document.querySelector<HTMLElement>("[data-overture]");
  const fresco = document.querySelector<HTMLImageElement>("[data-fresco]");
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const heroHeading = document.querySelector<HTMLElement>("[data-hero-heading]");
  const heroCopy = document.querySelector<HTMLElement>("[data-hero-copy]");
  const portrait = document.querySelector<HTMLElement>("[data-portrait]");
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const contactScroll = document.querySelector<HTMLElement>("[data-contact-scroll]");
  const loopReturn = document.querySelector<HTMLElement>("[data-loop-return]");

  if (!overture || !fresco || !hero || !heroHeading || !heroCopy || !portrait || !header) return;
  const media = gsap.matchMedia();
  const listeners = new AbortController();
  const { signal } = listeners;
  viewport.dataset.horizontal = "";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const updateOpening = () => {
    const pastOpeningLabel = viewport.scrollLeft >= viewport.clientWidth * .45;
    overture.inert = pastOpeningLabel;
    hero.toggleAttribute("inert", viewport.scrollLeft < viewport.clientWidth * .78);
    hero.toggleAttribute("data-light-visible", viewport.scrollLeft >= viewport.clientWidth * .28);
    overture.hidden = reducedMotion.matches && pastOpeningLabel;
  };
  updateOpening();
  viewport.addEventListener("scroll", updateOpening, { passive: true, signal });
  reducedMotion.addEventListener("change", updateOpening, { signal });

  const wheelPosition = { left: 0 };
  let wheelDestination: number | null = null;
  const moveWheel = gsap.quickTo(wheelPosition, "left", {
    duration: .32,
    ease: "power2.out",
    onUpdate: () => { viewport.scrollLeft = wheelPosition.left; },
    onComplete: () => { wheelDestination = null; },
  });
  const stopWheel = () => {
    moveWheel.tween.pause();
    wheelDestination = null;
  };
  const interruptScroll = () => {
    stopWheel();
    gsap.killTweensOf(viewport, "scrollLeft");
  };
  const loopEnd = () => viewport.scrollWidth - viewport.clientWidth;
  let loopWheelUntil = 0;
  let loopWheelLimit = 0;

  if (loopReturn && contactScroll) {
    viewport.addEventListener("scroll", () => {
      const end = loopEnd();
      if (end <= viewport.clientWidth || viewport.scrollLeft < end - 1) return;

      const now = performance.now();
      loopWheelUntil = now + 155;
      loopWheelLimit = now + 520;
      const restoreFocus = contactScroll.contains(document.activeElement) || document.activeElement === document.body;
      interruptScroll();
      viewport.scrollTo({ left: 0, behavior: "instant" });
      if (location.hash && location.hash !== "#inicio") history.replaceState(history.state, "", "#inicio");
      ScrollTrigger.update();
      updateOpening();
      if (restoreFocus) {
        overture.tabIndex = -1;
        overture.focus({ preventScroll: true });
      }
    }, { passive: true, signal });
  }
  const resetProjects = initProjectRail(viewport, media, interruptScroll, signal);
  reducedMotion.addEventListener("change", stopWheel, { signal });

  const position = (target: HTMLElement) => {
    if (target === overture) return 0;
    if (target === hero) return viewport.clientWidth;
    const slide = target.closest<HTMLElement>("[data-slide]") ?? target;
    return viewport.scrollLeft + slide.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
  };

  const goTo = (target: HTMLElement, animate: boolean, focus = true, duration = .8) => {
    stopWheel();
    gsap.killTweensOf(viewport, "scrollLeft");
    const left = position(target);
    const finish = () => {
      updateOpening();
      if (!focus) return;
      const focusTarget = target.dataset.projectStop
        ? document.getElementById(`project-title-${target.dataset.projectStop}`) ?? target
        : target;
      if (!focusTarget.hasAttribute("tabindex")) focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
    };
    if (animate && !reducedMotion.matches && Math.abs(left - viewport.scrollLeft) > 2) {
      viewport.dataset.navigating = "";
      const enableSnap = () => { delete viewport.dataset.navigating; };
      gsap.to(viewport, {
        scrollLeft: left,
        duration,
        ease: "power3.inOut",
        onComplete: () => { enableSnap(); finish(); },
        onInterrupt: enableSnap,
      });
    } else {
      viewport.scrollLeft = left;
      finish();
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element && event.target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      return;
    }
    const target = document.getElementById(link.hash.slice(1));
    if (!target || !viewport.contains(target)) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, "", link.hash);
    goTo(target, true);
  }, { signal });

  const restoreAnchor = () => {
    const target = document.getElementById(location.hash.slice(1)) ?? overture;
    if (viewport.contains(target)) goTo(target, false, false);
  };
  if (activeSection) goTo(activeSection, false, false);
  else if (location.hash) restoreAnchor();
  window.addEventListener("pageshow", () => {
    if (location.hash) requestAnimationFrame(() => { if (!signal.aborted) restoreAnchor(); });
  }, { signal });
  window.addEventListener("popstate", restoreAnchor, { signal });
  window.addEventListener("hashchange", restoreAnchor, { signal });

  const projectStops = Array.from(viewport.querySelectorAll<HTMLElement>("[data-project-stop]"));
  const firstProject = projectStops[0];
  const lastProject = projectStops.at(-1);
  const projectStepDuration = .55;
  let projectWheel = { direction: 0, lastEvent: -Infinity, lastStep: -Infinity, distance: 0, entering: false };
  const stepProject = (delta: number, target: HTMLElement, entering: boolean) => {
    const now = performance.now();
    const direction = Math.sign(delta);
    if (direction !== projectWheel.direction || now - projectWheel.lastEvent > 160) {
      projectWheel = { direction, lastEvent: now, lastStep: -Infinity, distance: 0, entering: false };
    }
    projectWheel.lastEvent = now;
    projectWheel.distance += Math.abs(delta);
    if (projectWheel.distance < 12) return;
    projectWheel.lastStep = now;
    projectWheel.distance = 0;
    projectWheel.entering = entering;
    goTo(target, true, false, projectStepDuration);
  };

  viewport.addEventListener("wheel", (event) => {
    if (event.ctrlKey || !(event.target instanceof Element) || event.target.closest("dialog[open]")) return;
    const horizontal = Math.abs(event.deltaX) >= Math.abs(event.deltaY);
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? viewport.clientWidth : 1;
    const delta = unit * (horizontal ? event.deltaX : event.deltaY * .97);
    if (!delta) return;
    const time = performance.now();
    if (delta > 0 && time < loopWheelUntil) {
      loopWheelUntil = Math.min(time + 155, loopWheelLimit);
      event.preventDefault();
      return;
    }
    const current = viewport.scrollLeft;

    const scrollable = event.target.closest<HTMLElement>("[data-contact-scroll], [data-slide], [data-hero], textarea");
    if (!horizontal && scrollable && scrollable.scrollHeight > scrollable.clientHeight + 2) {
      const canScrollDown = scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 2;
      if (event.deltaY < 0 ? scrollable.scrollTop > 0 : canScrollDown) {
        stopWheel();
        return;
      }
    }

    if (firstProject && lastProject) {
      const start = position(firstProject);
      const end = position(lastProject);
      const within = current >= start - 2 && current <= end + 2;
      // Consume momentum while the current step settles, including the entry from About.
      const sinceStep = time - projectWheel.lastStep;
      const entryMomentum = projectWheel.entering && time - projectWheel.lastEvent <= 160 && sinceStep < 1100;
      const settling = (within || gsap.isTweening(viewport)) && Math.sign(delta) === projectWheel.direction
        && (sinceStep < projectStepDuration * 1000 + 10 || entryMomentum);
      if (settling) {
        projectWheel.lastEvent = time;
        event.preventDefault();
        return;
      }
      const entering = current < start - 2 && ((horizontal ? null : wheelDestination) ?? current) + delta >= start;
      const target = entering ? firstProject : within && (delta > 0
        ? projectStops.find((stop) => position(stop) > current + 2)
        : projectStops.findLast((stop) => position(stop) < current - 2));
      if (target) {
        event.preventDefault();
        stepProject(delta, target, entering);
        return;
      }
    }

    gsap.killTweensOf(viewport, "scrollLeft");
    if (horizontal) {
      stopWheel();
      return;
    }
    event.preventDefault();
    if (reducedMotion.matches) {
      viewport.scrollLeft += delta;
      return;
    }
    const pending = wheelDestination === null ? 0 : wheelDestination - current;
    const uninterrupted = Math.sign(pending) === Math.sign(delta);
    wheelDestination = gsap.utils.clamp(0, viewport.scrollWidth - viewport.clientWidth, current + (uninterrupted ? pending : 0) + delta);
    moveWheel(wheelDestination, current);
  }, { passive: false, signal });
  viewport.addEventListener("touchstart", () => {
    stopWheel();
    gsap.killTweensOf(viewport, "scrollLeft");
  }, { passive: true, signal });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || document.querySelector("dialog[open], [data-mobile-nav][open]")) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
    event.preventDefault();
    stopWheel();
    gsap.killTweensOf(viewport, "scrollLeft");
    const width = viewport.clientWidth;
    const stops = [0, width * .54, width, ...Array.from(viewport.querySelectorAll<HTMLElement>("[data-slide], [data-project-stop]"), position)];
    if (loopReturn) stops.push(loopEnd());
    const left = event.key === "ArrowRight"
      ? stops.find((stop) => stop > viewport.scrollLeft + 2)
      : stops.findLast((stop) => stop < viewport.scrollLeft - 2);
    if (left !== undefined) viewport.scrollTo({ left, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }, { signal });

  media.add("(prefers-reduced-motion: no-preference)", () => {
    const art = overture.querySelector(".overture-art");
    const words = overture.querySelectorAll("[data-opening-letter]");
    const label = overture.querySelectorAll("[data-opening-word]");
    const footer = overture.querySelector("[data-opening-footer]");
    const title = overture.querySelector(".overture-content");
    overture.hidden = false;

    if (document.documentElement.hasAttribute("data-opening-pending")) {
      const diamond = (radius: number) => {
        const near = `calc(50% - ${radius}px)`;
        const far = `calc(50% + ${radius}px)`;
        return `polygon(50% ${near}, ${far} 50%, 50% ${far}, ${near} 50%)`;
      };
      const fullRadius = Math.ceil((overture.clientWidth + overture.clientHeight) / 2) + 4;
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(art, { opacity: .35, clipPath: diamond(5) }, {
          opacity: 1, clipPath: diamond(fullRadius), duration: 1.05, ease: "power2.inOut", clearProps: "clipPath,opacity",
        }, 0)
        .fromTo(header, { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .63, clearProps: "transform,opacity" }, .48)
        .fromTo(words, { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .66, stagger: .032, clearProps: "transform,opacity" }, .71)
        .fromTo(label, { yPercent: 95, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, stagger: .08, clearProps: "transform,opacity" }, .99)
        .fromTo(footer, { opacity: 0 }, { opacity: 1, duration: .5, clearProps: "opacity" }, 1.09);
    }
    delete document.documentElement.dataset.openingPending;

    const entrance = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { scroller: viewport, horizontal: true, start: 0, end: () => viewport.clientWidth, scrub: true, invalidateOnRefresh: true },
    });
    entrance
      .to(fresco, { scale: 3.2, x: "12vw", y: "5vh", duration: 1 }, 0)
      .to(title, { opacity: 0, xPercent: -3, duration: .38 }, 0)
      .to(footer, { y: 12, duration: .44 }, 0)
      .to(overture, { opacity: 0, duration: .43 }, .48)
      .fromTo(heroHeading, { scale: .52, x: "8vw", y: "2vh", opacity: 0 }, { scale: 1, x: 0, y: 0, opacity: 1, duration: .54 }, .46)
      .fromTo(portrait, { scale: .42, x: 0, y: "4vh", opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: .61 }, .39)
      .fromTo(heroCopy, { scale: .65, x: "-5vw", y: "2vh", opacity: 0 }, { scale: 1, x: 0, y: 0, opacity: 1, duration: .47 }, .53);
    entrance.eventCallback("onUpdate", () => {
      overture.style.pointerEvents = entrance.progress() >= .69 ? "none" : "";
    });

    const lastSlide = contactScroll?.closest<HTMLElement>("[data-slide]");
    if (loopReturn && contactScroll && lastSlide) {
      const returnToOpening = gsap.timeline({
        scrollTrigger: {
          scroller: viewport, trigger: lastSlide, horizontal: true, start: "left left",
          end: () => `+=${viewport.clientWidth}`, scrub: true,
          onUpdate: ({ progress }) => { contactScroll.inert = progress >= .86; },
        },
      });
      returnToOpening
        .fromTo(loopReturn, { opacity: 0 }, { opacity: 1, duration: 1, ease: "none" }, 0)
        .fromTo(loopReturn.querySelector(".overture-content"), { y: 19, opacity: 0 }, { y: 0, opacity: 1, duration: .45, ease: "power2.out" }, .55)
        .fromTo(loopReturn.querySelector("[data-opening-footer]"), { opacity: 0 }, { opacity: 1, duration: .31 }, .69);
    }

    gsap.utils.toArray<HTMLElement>("[data-slide]").forEach((slide) => {
      const about = slide.querySelector("[data-about]");
      if (about) {
        gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            scroller: viewport, horizontal: true, trigger: slide, start: "left 93%", end: "left 3%", scrub: true,
          },
        })
          .fromTo(about.querySelector("[data-about-label]"), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .31 }, 0)
          .fromTo(about.querySelector("[data-about-title]"), { x: 54, y: 25, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .58 }, .07)
          .fromTo(about.querySelectorAll("[data-about-copy] > *"), { x: 32, y: 16, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .43, stagger: .11 }, .24)
          .fromTo(about.querySelectorAll("[data-about-notes] > div"), { y: 23, opacity: 0 }, { y: 0, opacity: 1, duration: .37, stagger: .095 }, .48);
        return;
      }
      const certificates = slide.querySelector("[data-certificates]");
      if (certificates) {
        gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            scroller: viewport, horizontal: true, trigger: slide, start: "left 95%", end: "left 4%", scrub: true,
          },
        })
          .fromTo(certificates.querySelectorAll("[data-certificates-header] > *"), { x: 25, y: 15, opacity: 0 }, {
            x: 0, y: 0, opacity: 1, duration: .46, stagger: .075,
          }, 0)
          .fromTo(certificates.querySelector("[data-certificates-grid]"), { "--certificate-grid-progress": 0 }, {
            "--certificate-grid-progress": 1, duration: .65, ease: "none",
          }, .24)
          .fromTo(certificates.querySelector("[data-certificates-more]"), { y: 12, opacity: 0 }, {
            y: 0, opacity: 1, duration: .28,
          }, .71);
        return;
      }
      const skills = slide.querySelector("[data-skills]");
      const contact = slide.querySelector("[data-contact]");
      if (skills || contact) {
        const reveal = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: { scroller: viewport, horizontal: true, trigger: slide, start: "left 92%", end: "left 3%", scrub: true },
        });

        if (skills) {
          reveal
            .fromTo(skills.querySelectorAll("[data-skills-header] > *"), { y: 18, opacity: .2 }, { y: 0, opacity: 1, duration: .42, stagger: .07 }, 0)
            .fromTo(skills.querySelector("[data-skills-scene]"), { x: 34, y: 23, scale: .97, opacity: .15 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: .68 }, .16)
            .fromTo(skills.querySelector("[data-skill-detail]"), { y: 15, opacity: .15 }, { y: 0, opacity: 1, duration: .45 }, .39);
        } else if (contact) {
          reveal
            .fromTo(contact.querySelectorAll("[data-contact-intro] > *"), { y: 19, opacity: .2 }, { y: 0, opacity: 1, duration: .44, stagger: .075 }, 0)
            .fromTo(contact.querySelector("#contact-form"), { x: 31, y: 20, opacity: .15 }, { x: 0, y: 0, opacity: 1, duration: .64 }, .18);
        }
        return;
      }
      const heading = slide.querySelector(".section-title");
      if (!heading) return;
      gsap.fromTo(heading, { x: 64, opacity: .38 }, {
        x: 0, opacity: 1, ease: "none",
        scrollTrigger: { scroller: viewport, horizontal: true, trigger: slide, start: "left 92%", end: "left 18%", scrub: true },
      });
    });

    return () => {
      overture.style.removeProperty("pointer-events");
      contactScroll?.removeAttribute("inert");
    };
  });

  return () => {
    listeners.abort();
    interruptScroll();
    moveWheel.tween.kill();
    media.revert();
    resetProjects?.();
    overture.hidden = false;
    overture.inert = false;
    hero.inert = false;
    delete hero.dataset.lightVisible;
    delete viewport.dataset.navigating;
    delete viewport.dataset.horizontal;
    viewport.scrollLeft = 0;
  };
}

if (viewport) {
  const desktop = window.matchMedia(desktopPresentation);
  let unmount: (() => void) | undefined;
  const syncLayout = () => {
    const activeSection = unmount ? document.elementFromPoint(innerWidth / 2, Math.min(innerHeight / 2, 300))
      ?.closest<HTMLElement>("section[id]") : undefined;
    unmount?.();
    if (desktop.matches) {
      window.scrollTo(0, 0);
      unmount = mountDesktop(viewport, activeSection);
      ScrollTrigger.refresh();
    } else {
      delete document.documentElement.dataset.openingPending;
      unmount = initCompactProjects(viewport);
      activeSection?.scrollIntoView({ block: "start" });
    }
  };
  syncLayout();
  desktop.addEventListener("change", syncLayout);
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const opener = event.target.closest<HTMLElement>("[data-dialog-open]");
  const dialog = opener?.dataset.dialogOpen && document.getElementById(opener.dataset.dialogOpen);
  if (dialog instanceof HTMLDialogElement && opener && !dialog.open) {
    dialog.showModal();
    dialog.dispatchEvent(new CustomEvent("portfolio:dialog-open", { detail: opener }));
  }

  if (event.target instanceof HTMLDialogElement) {
    const { left, right, top, bottom } = event.target.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) event.target.close();
  }
});

document.fonts.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
