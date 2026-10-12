import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

/**
 * Alert that also works in the web build (React Native Web's Alert is a no-op).
 * On web: one button -> window.alert, several -> window.confirm (OK runs the first non-cancel button).
 */
function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    NativeAlert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  if (actions.length > 1) {
    // Several real choices (e.g. account "More" menu): ask for each in turn.
    for (const action of actions) {
      if (window.confirm(`${text}\n\n${action.text}?`)) {
        action.onPress?.();
        return;
      }
    }
    return;
  }
  if (window.confirm(`${text}\n\n${actions[0]?.text ?? 'OK'}?`)) {
    actions[0]?.onPress?.();
  } else {
    buttons.find((b) => b.style === 'cancel')?.onPress?.();
  }
}

export const Alert = { alert };
