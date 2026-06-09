"use client";

import { useEffect, useRef } from "react";

// A section becomes "current" once its top crosses this line (px from viewport top).
// MUST sit below where a restored section lands: sections use `scroll-mt-24`
// (96px), so a refresh scrolls the section title to y≈96. Keeping this line lower
// (120 > 96) makes a just-restored section unambiguously the active one — at the
// same value, sub-pixel rounding can pick the section above and the hash drifts
// upward by one section on every refresh.
const TOP = 120;

/**
 * Markdown-docs-style scroll memory: as a `[data-section]` header scrolls past
 * the top, mirror its id into the URL hash (via replaceState — no history spam).
 * A reload then resumes at that section. Only active while `enabled` (e.g. the
 * full grid with no country filter); when disabled it neither reads nor writes.
 */
export function useSectionScrollSpy(enabled: boolean) {
  const restored = useRef(false);

  // On first enable (page load), jump to the section named in the hash. Capture
  // the id synchronously so the scroll handler below can't clobber it first.
  useEffect(() => {
    if (!enabled || restored.current) return;
    restored.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      }),
    );
  }, [enabled]);

  // Keep the hash pointed at the topmost section as you scroll.
  useEffect(() => {
    if (!enabled) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const els = document.querySelectorAll<HTMLElement>("[data-section]");
      let curr = "";
      for (const el of els) {
        if (el.getBoundingClientRect().top <= TOP) curr = el.id;
        else break;
      }
      const hash = curr ? `#${curr}` : "";
      if (hash !== window.location.hash) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search + hash,
        );
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);
}
