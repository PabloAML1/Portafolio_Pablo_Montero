import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

interface PlaylistItem {
  image: string;
  text: string;
  dialogId: string;
}

interface Props {
  items: PlaylistItem[];
}

export function ProjectsPlaylist({ items }: Props) {
  const [state, setState] = useState<{ item: PlaylistItem; visible: boolean; interrupted?: boolean } | null>(null);
  const hovered = useRef<PlaylistItem | null>(null);
  const preview = useRef<HTMLElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const motion = useRef<{ x: ReturnType<typeof gsap.quickTo>; y: ReturnType<typeof gsap.quickTo> } | null>(null);
  const lastExit = useRef<number | null>(-Infinity);
  const reduced = useRef<MediaQueryList | null>(null);

  const placePreview = () => {
    const element = preview.current;
    if (!element) return;
    const { x, y } = pointer.current;
    const { offsetWidth: width, offsetHeight: height } = element;
    const gap = 18;
    const edge = 22;
    const right = x + gap;
    const left = Math.max(edge, right + width <= window.innerWidth - edge ? right : x - width - gap);
    const top = Math.max(edge, Math.min(window.innerHeight - height - edge, y - height * .45));
    reduced.current ??= window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!motion.current) {
      const follow = { duration: .4, ease: "power3.out" };
      motion.current = { x: gsap.quickTo(element, "x", follow), y: gsap.quickTo(element, "y", follow) };
    }
    const wasHidden = lastExit.current !== null && performance.now() - lastExit.current > 280;
    if (reduced.current.matches || wasHidden) {
      motion.current.x(left, left);
      motion.current.y(top, top);
      gsap.set(element, { x: left, y: top });
    } else {
      motion.current.x(left);
      motion.current.y(top);
    }
    lastExit.current = null;
  };

  useLayoutEffect(() => {
    if (state?.visible) placePreview();
  }, [state]);

  const hidePreview = (interrupted = false) => {
    hovered.current = null;
    lastExit.current = interrupted ? -Infinity : performance.now();
    setState((current) => current?.visible ? { ...current, visible: false, interrupted } : current);
  };

  useEffect(() => {
    const hide = () => hidePreview(true);
    document.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("blur", hide);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
      window.removeEventListener("resize", hide);
      motion.current?.x.tween.kill();
      motion.current?.y.tween.kill();
      motion.current = null;
    };
  }, []);

  const showPreview = (event: PointerEvent<HTMLButtonElement>, item: PlaylistItem) => {
    if (event.pointerType === "touch" || (event.pointerType === "pen" && event.buttons)) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (hovered.current === item) placePreview();
    else {
      hovered.current = item;
      setState({ item, visible: true });
    }
  };

  const rememberPreview = (event: MouseEvent<HTMLButtonElement>, item: PlaylistItem) => {
    const element = preview.current;
    if (event.detail > 0 && hovered.current === item && element?.querySelector("img")?.naturalWidth) {
      const rect = element.getBoundingClientRect();
      event.currentTarget.dataset.previewOrigin = [
        rect.left + rect.width / 2, rect.top + rect.height / 2, element.offsetWidth, element.offsetHeight,
      ].join(",");
    }
    hidePreview(true);
  };

  return (
    <>
      <ol className="certificate-list">
        {items.map((item, index) => (
          <li key={item.dialogId} style={{ "--certificate-row-index": Math.floor(index / 2) } as CSSProperties}>
            <button
              className="certificate-row"
              type="button"
              aria-haspopup="dialog"
              data-dialog-open={item.dialogId}
              onPointerEnter={(event) => showPreview(event, item)}
              onPointerMove={(event) => showPreview(event, item)}
              onPointerLeave={() => hidePreview()}
              onClick={(event) => rememberPreview(event, item)}
            >
              <span>{item.text}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </li>
        ))}
      </ol>
      {state && createPortal(
        <figure
          ref={preview}
          className="certificate-preview"
          data-visible={state.visible}
          data-interrupted={state.interrupted || undefined}
          aria-hidden="true"
        >
          <img key={state.item.image} src={state.item.image} alt="" decoding="async" onLoad={() => { if (hovered.current) placePreview(); }} />
        </figure>,
        document.body
      )}
    </>
  );
}
