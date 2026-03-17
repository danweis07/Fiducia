// =============================================================================
// DYNAMIC GOOGLE FONTS LOADER
// =============================================================================

import type { ThemeFont } from './index';

const GOOGLE_FONT_URLS: Record<ThemeFont, string> = {
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'open-sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
  'dm-sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
  nunito: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap',
};

const LINK_ID_PREFIX = 'theme-font-';

/**
 * Loads the specified Google Font by injecting a <link> into <head>.
 * Removes previously loaded theme fonts to avoid accumulation.
 */
export function loadFont(font: ThemeFont): void {
  const linkId = `${LINK_ID_PREFIX}${font}`;

  // Already loaded
  if (document.getElementById(linkId)) return;

  // Remove other theme font links
  document
    .querySelectorAll(`link[id^="${LINK_ID_PREFIX}"]`)
    .forEach((el) => el.remove());

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONT_URLS[font];
  document.head.appendChild(link);
}
