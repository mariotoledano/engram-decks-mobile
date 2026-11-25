import { Platform, Pressable, StyleSheet, type AccessibilityRole } from 'react-native';

import type { IconProps } from '@/components/icons';
import { useTheme } from '@/hooks/use-theme';

const BUTTON_SIZE = 36;

interface IconButtonProps {
  icon: (props: IconProps) => React.ReactNode;
  accessibilityLabel: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityRole?: AccessibilityRole;
}

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  selected = false,
  disabled = false,
  onPress,
  accessibilityRole = 'button',
}: IconButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed, hovered }) => {
        const active = !disabled && (pressed || hovered);
        const backgroundColor = selected
          ? pressed
            ? theme.accentPressed
            : theme.accent
          : active
            ? theme.backgroundSelected
            : theme.backgroundElement;
        const borderColor = selected ? backgroundColor : theme.line;

        return [
          styles.button,
          { backgroundColor, borderColor, opacity: disabled ? 0.4 : 1 },
          Platform.OS === 'web' ? (disabled ? styles.webDisabled : styles.web) : null,
        ];
      }}>
      <Icon color={selected ? theme.onAccent : theme.text} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  web: {
    cursor: 'pointer',
  },
  webDisabled: {
    cursor: 'default',
  },
});
