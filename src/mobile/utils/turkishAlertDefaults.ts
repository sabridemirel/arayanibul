import { Alert, AlertButton } from 'react-native';

// Alert.alert without buttons shows a native "OK" button in English. The app's UI is Turkish,
// so default to a single "Tamam" button whenever a call passes no buttons.
const originalAlert = Alert.alert.bind(Alert);

Alert.alert = (title, message, buttons, options) => {
  const withDefault: AlertButton[] | undefined = buttons && buttons.length > 0 ? buttons : [{ text: 'Tamam' }];
  originalAlert(title, message, withDefault, options);
};
