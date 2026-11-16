import { flushSync } from 'react-dom';

export let activePortraitTransition: string | null = null;
type Transition = { finished: Promise<void> };
type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => Transition;
};

export function navigateWithTransition(navigate: () => void, portrait?: HTMLElement | null) {
  const doc = document as TransitionDocument;
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate();
    return;
  }
  activePortraitTransition = portrait ? 'hero-portrait' : null;
  if (portrait) portrait.style.setProperty('view-transition-name', 'hero-portrait');
  try {
    const transition = doc.startViewTransition(() => flushSync(navigate));
    void transition.finished.catch(() => undefined).finally(() => {
      activePortraitTransition = null;
      document.querySelectorAll<HTMLElement>('[style*="hero-portrait"]').forEach(element => {
        element.style.removeProperty('view-transition-name');
      });
      portrait?.style.removeProperty('view-transition-name');
    });
  } catch {
    activePortraitTransition = null;
    portrait?.style.removeProperty('view-transition-name');
    navigate();
  }
}
