import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  clearLabel: string;
}

export function SearchField({ value, onChange, placeholder, accessibilityLabel, clearLabel }: SearchFieldProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.searchRow, { borderColor: theme.line }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: theme.text }]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChange('')}
          hitSlop={Spacing.two}
          style={styles.clear}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ×
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingLeft: Spacing.three,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: Spacing.two,
  },
  clear: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
