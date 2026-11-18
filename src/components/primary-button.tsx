import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const backgroundColor =
    variant === 'danger' ? theme.danger : variant === 'secondary' ? theme.backgroundElement : theme.accent;
  const textColor = variant === 'secondary' ? theme.text : variant === 'danger' ? '#FFFBF5' : theme.onAccent;
  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <ThemedText type="smallBold" style={{ color: textColor }}>
      {label}
    </ThemedText>
  );
  const frame = [
    styles.button,
    variant === 'secondary' ? { borderWidth: 1, borderColor: theme.line } : null,
    { backgroundColor },
  ];

  if (!onPress) {
    return <View style={frame}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        ...frame,
        {
          backgroundColor: pressed && variant === 'primary' ? theme.accentPressed : backgroundColor,
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 48,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
