import { useEffect } from 'react';

const DEFAULT_TITLE = 'Arayanibul – Ters pazar yeri: siz ilan verin, satıcılar teklif getirsin';
const DEFAULT_DESCRIPTION =
  'Arayanibul bir ters pazar yeridir: aradığınız ürün veya hizmet için ücretsiz ilan verin, satıcılar size teklif getirsin. Ters ilan mantığıyla çalışır; ilanlara göz atıp siz de teklif verin.';
const SITE_ORIGIN = 'https://arayanibul.com';

const setMeta = (selector: string, attribute: 'content' | 'href', value: string) => {
  document.head.querySelector(selector)?.setAttribute(attribute, value);
};

const apply = (title: string, description: string, path: string) => {
  document.title = title;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', SITE_ORIGIN + path);
  setMeta('link[rel="canonical"]', 'href', SITE_ORIGIN + path);
};

/**
 * Sets the tab title, meta description and canonical URL for the current page, and restores the
 * site defaults when the page is left. Pass undefined values while the page content is loading.
 */
export const usePageMeta = (title?: string, description?: string, canonicalPath?: string) => {
  useEffect(() => {
    apply(
      title ? `${title} | Arayanibul` : DEFAULT_TITLE,
      description || DEFAULT_DESCRIPTION,
      canonicalPath ?? window.location.pathname
    );
    return () => apply(DEFAULT_TITLE, DEFAULT_DESCRIPTION, '/');
  }, [title, description, canonicalPath]);
};
