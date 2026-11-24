import gsap from "gsap";
import { skills } from "../data/skills";
import { getLanguage, getTranslation } from "./i18n";
import { desktopPresentation } from "./portfolio-layout";

const section = document.querySelector<HTMLElement>("[data-skills]");
const scene = section?.querySelector<HTMLElement>("[data-skills-scene]");
const keyboard = section?.querySelector<HTMLElement>("[data-skills-keyboard]");
const category = section?.querySelector<HTMLElement>("[data-skill-category]");
const name = section?.querySelector<HTMLElement>("[data-skill-name]");
const description = section?.querySelector<HTMLElement>("[data-skill-description]");
const announcement = section?.querySelector<HTMLElement>("[data-skill-announcement]");
const shortcutLabel = section?.querySelector<HTMLElement>("[data-skill-shortcut]");
const soundButton = section?.querySelector<HTMLButtonElement>("[data-key-sound]");

if (section && scene && keyboard && category && name && description && announcement && shortcutLabel && soundButton) {
  const keys = Array.from(keyboard.querySelectorAll<HTMLButtonElement>("[data-skill-key]"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia(desktopPresentation);
  const tilt = { x: 0, y: 0 };
  const paintTilt = () => {
    scene.style.setProperty("--keyboard-tilt-x", `${tilt.x}deg`);
    scene.style.setProperty("--keyboard-tilt-y", `${tilt.y}deg`);
  };
  const tiltX = gsap.quickTo(tilt, "x", { duration: .65, ease: "power2.out", onUpdate: paintTilt });
  const tiltY = gsap.quickTo(tilt, "y", { duration: .65, ease: "power2.out", onUpdate: paintTilt });
  let selected = 0;
  let shown = 0;
  let hovered: HTMLButtonElement | null = null;
  let pressed: HTMLButtonElement | undefined;
  let release: number | undefined;
  let audio: AudioContext | undefined;
  let keystroke: Promise<AudioBuffer | undefined> | undefined;
  let soundRequest = 0;
  const soundPreference = "skill-keyboard-muted";
  let soundEnabled = localStorage.getItem(soundPreference) !== "true";

  const unlockAudio = () => {
    if (!soundEnabled || typeof AudioContext === "undefined") return;
    try {
      const context = audio ??= new AudioContext();
      keystroke ??= fetch("/sounds/skill-key-click.wav")
        .then((response) => {
          if (!response.ok) throw new Error("Key sound unavailable");
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes))
        .catch(() => undefined);
      if (context.state === "suspended") void context.resume().catch(() => {});
    } catch {
      // The visual feedback remains available when audio is blocked.
    }
  };

  if (typeof AudioContext !== "undefined") {
    soundButton.hidden = false;
    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    const unlockFromDocument = () => { if (desktop.matches) unlockAudio(); };
    document.addEventListener("click", unlockFromDocument, { capture: true, once: true });
    document.addEventListener("keydown", unlockFromDocument, { capture: true, once: true });
    soundButton.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      soundRequest++;
      localStorage.setItem(soundPreference, String(!soundEnabled));
      soundButton.setAttribute("aria-pressed", String(soundEnabled));
      unlockAudio();
    });
  }

  const playKey = () => {
    if (!soundEnabled) return;
    if (!audio && navigator.userActivation?.hasBeenActive) unlockAudio();
    const context = audio;
    if (!context) return;

    const request = ++soundRequest;
    const play = async () => {
      const sample = await keystroke;
      if (!sample || !soundEnabled || request !== soundRequest || context.state !== "running") return;
      const source = context.createBufferSource();
      source.buffer = sample;
      source.connect(context.destination);
      source.start();
    };
    if (context.state === "running") void play();
    else if (navigator.userActivation?.isActive) void context.resume().then(play).catch(() => {});
  };

  const displaySkill = (index: number) => {
    if (shown !== index) {
      keys[shown].setAttribute("aria-pressed", "false");
      keys[index].setAttribute("aria-pressed", "true");
    }
    shown = index;
    const skill = skills[index];
    const language = getLanguage();
    category.textContent = getTranslation(skill.category, language);
    name.textContent = skill.name;
    description.textContent = skill[language];
    shortcutLabel.textContent = skill.shortcut;
  };

  const selectSkill = (index: number, activate = false) => {
    const key = keys[index];
    keys[selected].tabIndex = -1;
    key.tabIndex = 0;
    selected = index;
    displaySkill(index);
    if (!activate) return;

    playKey();
    announcement.textContent = `${skills[index].name}. ${description.textContent}`;
    window.clearTimeout(release);
    pressed?.removeAttribute("data-pressed");
    key.dataset.pressed = "";
    pressed = key;
    release = window.setTimeout(() => key.removeAttribute("data-pressed"), 160);
  };

  keys.forEach((key, index) => {
    let pointerType = "mouse";
    key.tabIndex = index === 0 ? 0 : -1;
    key.addEventListener("pointerdown", (event) => { pointerType = event.pointerType; });
    key.addEventListener("focus", () => selectSkill(index));
    key.addEventListener("click", (event) => selectSkill(index, event.detail === 0 || pointerType !== "mouse"));
  });

  const setHoveredKey = (key: HTMLButtonElement | null) => {
    if (key === hovered) return;
    hovered?.removeAttribute("data-hovered");
    hovered = key;
    if (!key) return;
    key.dataset.hovered = "";
    const index = Number(key.dataset.skillKey);
    displaySkill(index);
    playKey();
  };

  keyboard.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    // Keep the keys' hit areas still while the pointer travels across the board.
    tiltX.tween.pause();
    tiltY.tween.pause();
  });
  keyboard.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
    const key = event.target.closest<HTMLButtonElement>("[data-skill-key]");
    if (!key && hovered) {
      const { left, right, top, bottom } = hovered.getBoundingClientRect();
      const { clientX: x, clientY: y } = event;
      if (x >= left - 4 && x <= right + 4 && y >= top - 4 && y <= bottom + 4) return;
    }
    setHoveredKey(key);
  });
  keyboard.addEventListener("pointerleave", () => setHoveredKey(null));
  window.addEventListener("blur", () => setHoveredKey(null));

  keyboard.addEventListener("keydown", (event) => {
    if (!(event.target instanceof HTMLButtonElement) || !event.target.matches("[data-skill-key]")) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const columns = Number(getComputedStyle(scene).getPropertyValue("--keyboard-columns"));
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const index = Number(event.target.dataset.skillKey);
    keys[gsap.utils.clamp(0, keys.length - 1, index + offset)].focus({ preventScroll: true });
  });

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (!(event.target instanceof Element) || event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (document.querySelector("dialog[open], [data-mobile-nav][open]")) return;

    const index = skills.findIndex(({ shortcut }) => shortcut === event.key.toUpperCase());
    if (index < 0) return;
    const bounds = section.getBoundingClientRect();
    const visibleWidth = Math.min(bounds.right, innerWidth) - Math.max(bounds.left, 0);
    if (visibleWidth < Math.min(bounds.width, innerWidth) * .64 || bounds.bottom <= 0 || bounds.top >= innerHeight) return;

    event.preventDefault();
    selectSkill(index, true);
  });

  scene.addEventListener("pointermove", (event) => {
    if (!desktop.matches || event.pointerType !== "mouse" || reducedMotion.matches || keyboard.contains(event.target as Node)) return;
    const rect = scene.getBoundingClientRect();
    tiltX((.5 - (event.clientY - rect.top) / rect.height) * 10);
    tiltY(((event.clientX - rect.left) / rect.width - .5) * 12);
  });
  scene.addEventListener("pointerleave", () => {
    tiltX(0);
    tiltY(0);
  });

  window.addEventListener("language-change", () => displaySkill(shown));
  displaySkill(selected);
}
