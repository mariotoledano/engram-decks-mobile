import { type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { FilterChipBox, type FilterChip } from '@/components/filter-chip-box';
import { PlusIcon, type IconProps } from '@/components/icons';
import { SearchField } from '@/components/search-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PICKER_HEIGHT = 180;

interface AddChipButtonProps {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}

export function AddChipButton({ label, disabled = false, onPress }: AddChipButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.addChip,
        {
          borderColor: theme.line,
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          opacity: disabled ? 0.6 : 1,
        },
        Platform.OS === 'web' ? styles.webPointer : null,
      ]}>
      <PlusIcon color={theme.text} size={16} />
    </Pressable>
  );
}

interface ChipPickerProps {
  visible: boolean;
  closeLabel: string;
  onClose: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  searchLabel: string;
  clearLabel: string;
  chips: FilterChip[];
  leadingChips?: FilterChip[];
  Icon: (props: IconProps) => ReactNode;
  emptyLabel: string;
  error?: string | null;
  onPress: (key: string) => void;
  onRetry?: () => void;
  notice?: string | null;
}

export function ChipPicker({
  visible,
  closeLabel,
  onClose,
  query,
  onQueryChange,
  placeholder,
  searchLabel,
  clearLabel,
  chips,
  leadingChips,
  Icon,
  emptyLabel,
  error,
  onPress,
  onRetry,
  notice,
}: ChipPickerProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={styles.backdrop} />
        <View style={[styles.dialog, { backgroundColor: theme.background, borderColor: theme.line }]}>
          <SearchField
            value={query}
            onChange={onQueryChange}
            placeholder={placeholder}
            accessibilityLabel={searchLabel}
            clearLabel={clearLabel}
          />
          <FilterChipBox
            chips={chips}
            leadingChips={leadingChips}
            Icon={Icon}
            emptyLabel={emptyLabel}
            error={error}
            height={PICKER_HEIGHT}
            onPress={onPress}
            onRetry={onRetry}
          />
          {notice ? <ThemedText themeColor="danger">{notice}</ThemedText> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addChip: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webPointer: {
    cursor: 'pointer',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 18, 16, 0.45)',
  },
  dialog: {
    zIndex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
