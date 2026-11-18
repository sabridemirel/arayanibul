import { createContext, useContext } from 'react';
import { EdgeInsets } from 'react-native-safe-area-context';

/**
 * Insets of the whole window (status bar, navigation bar).
 *
 * On Android the navigator is laid out above the system navigation bar (see App.tsx), so
 * `useSafeAreaInsets()` reports a bottom inset of 0 inside it. Modals are separate windows that
 * still draw under the bar; anything rendered in a Modal should use this hook instead.
 */
const WindowInsetsContext = createContext<EdgeInsets>({ top: 0, right: 0, bottom: 0, left: 0 });

export const WindowInsetsProvider = WindowInsetsContext.Provider;
export const useWindowInsets = () => useContext(WindowInsetsContext);
