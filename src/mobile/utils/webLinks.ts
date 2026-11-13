import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

// Public web site (legal pages, contact, password reset). Set EXPO_PUBLIC_WEB_URL per build profile.
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://arayanibul.com').replace(/\/$/, '');

export const WEB_PAGES = {
  privacy: '/privacy',
  terms: '/terms',
  kvkk: '/kvkk',
  accountDeletion: '/account-deletion',
  contact: '/contact',
} as const;

export type WebPage = keyof typeof WEB_PAGES;

export const getWebPageUrl = (page: WebPage) => `${WEB_URL}${WEB_PAGES[page]}`;

// Opens a page of the web site in an in-app browser, falling back to the system browser
export const openWebPage = async (page: WebPage) => {
  const url = getWebPageUrl(page);
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Could not open web page:', url, error);
    }
  }
};
