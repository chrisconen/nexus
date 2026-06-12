import type { Locale } from './translations';

/**
 * Extracts the locale from an Astro URL.
 * With prefixDefaultLocale: false, default locale (hu) has no prefix.
 * EN: /en/... , DE: /de/...
 */
export function getLocaleFromUrl(url: URL): Locale {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length > 0 && (segments[0] === 'en' || segments[0] === 'de')) {
    return segments[0] as Locale;
  }
  return 'hu';
}

/**
 * Converts a URL path to the target locale.
 * e.g. localizedUrl('/arazas', 'en') → '/en/arazas'
 *      localizedUrl('/en/arazas', 'hu') → '/arazas'
 *      localizedUrl('/en/arazas', 'de') → '/de/arazas'
 */
export function localizedUrl(path: string, targetLocale: Locale, currentLocale: Locale): string {
  // Remove any existing locale prefix
  let cleanPath = path;
  if (path.startsWith('/en/') || path.startsWith('/de/')) {
    cleanPath = path.substring(3);
  } else if (path === '/en' || path === '/de') {
    cleanPath = '/';
  }

  if (targetLocale === 'hu') {
    return cleanPath || '/';
  }
  return `/${targetLocale}${cleanPath}`;
}

/**
 * Returns the alternate locale URLs for a given current locale and path.
 * Used for hreflang tags and language switcher.
 */
export function getAlternateUrls(pathname: string, currentLocale: Locale): Record<Locale, string> {
  const locales: Locale[] = ['hu', 'en', 'de'];
  const result = {} as Record<Locale, string>;
  for (const loc of locales) {
    result[loc] = localizedUrl(pathname, loc, currentLocale);
  }
  return result;
}

/**
 * Converts a path to be relative to current locale for internal links.
 * e.g. if current locale is 'en' and path is '/arazas' → '/en/arazas'
 */
export function localeRelativePath(path: string, currentLocale: Locale): string {
  if (currentLocale === 'hu') return path;
  return `/${currentLocale}${path}`;
}
