import { type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import type { IconProps } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const CHIP_BOX_HEIGHT = 96;

export interface FilterChip {
  key: string;
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  Icon?: (props: IconProps) => ReactNode;
}

interface FilterChipBoxProps {
  chips: FilterChip[];
  leadingChips?: FilterChip[];
  Icon: (props: IconProps) => ReactNode;
  emptyLabel: string;
  error?: string | null;
  height?: number;
  onPress: (key: string) => void;
  onRetry?: () => void;
}

export function FilterChipButton({
  chip,
  Icon,
  onPress,
}: {
  chip: FilterChip;
  Icon: (props: IconProps) => ReactNode;
  onPress: (key: string) => void;
}) {
  const theme = useTheme();
  const ChipIcon = chip.Icon ?? Icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: chip.selected }}
      accessibilityLabel={chip.accessibilityLabel}
      onPress={() => onPress(chip.key)}
      style={[
        styles.chip,
        {
          backgroundColor: chip.selected ? theme.backgroundSelected : theme.background,
          borderColor: chip.selected ? theme.accent : theme.line,
        },
      ]}>
      <View style={styles.chipIcon}>
        <ChipIcon color={chip.selected ? theme.accent : theme.textSecondary} size={16} />
      </View>
      <ThemedText type="small" numberOfLines={1} ellipsizeMode="tail" style={styles.chipLabel}>
        {chip.label}
      </ThemedText>
    </Pressable>
  );
}

export function FilterChipBox({
  chips,
  leadingChips = [],
  Icon,
  emptyLabel,
  error,
  height,
  onPress,
  onRetry,
}: FilterChipBoxProps) {
  const theme = useTheme();

  const leading = leadingChips.map((chip) => (
    <FilterChipButton key={chip.key} chip={chip} Icon={Icon} onPress={onPress} />
  ));

  return (
    <ThemedView type="backgroundElement" style={[styles.box, { borderColor: theme.line, height: height ?? CHIP_BOX_HEIGHT }]}>
      <ScrollView
        style={[styles.boxScroll, Platform.OS === 'web' ? webVerticalScroll : null]}
        contentContainerStyle={styles.chips}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled>
        {leading}
        {error && chips.length === 0 ? (
          <View style={styles.boxMessage}>
            <ThemedText themeColor="textSecondary">{error}</ThemedText>
            {onRetry ? (
              <Pressable accessibilityRole="button" onPress={onRetry}>
                <ThemedText type="linkPrimary">Reintentar</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : chips.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.fullRow}>
            {emptyLabel}
          </ThemedText>
        ) : (
          chips.map((chip) => <FilterChipButton key={chip.key} chip={chip} Icon={Icon} onPress={onPress} />)
        )}
      </ScrollView>
    </ThemedView>
  );
}

const webVerticalScroll = { overflowY: 'scroll' } as ViewStyle;

const styles = StyleSheet.create({
  box: {
    height: CHIP_BOX_HEIGHT,
    borderWidth: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  boxScroll: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.three,
  },
  chipIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    maxWidth: 200,
    flexShrink: 1,
  },
  boxMessage: {
    width: '100%',
    gap: Spacing.two,
  },
  fullRow: {
    width: '100%',
  },
});
