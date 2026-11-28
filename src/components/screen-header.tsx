import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from 'expo-router';

import { BackLink } from '@/components/back-link';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 64;

function headerTitle(options: NativeStackHeaderProps['options']): string {
  if (typeof options.headerTitle === 'string') {
    return options.headerTitle;
  }
  return options.title ?? '';
}

export function ScreenHeader(props: NativeStackHeaderProps) {
  return <ScreenHeaderView {...props} />;
}

function ScreenHeaderView({ back, options }: NativeStackHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const canGoBack = back != null;
  const title = headerTitle(options);
  const tintColor = theme.text;
  const left =
    options.headerLeft?.({
      tintColor,
      canGoBack,
      label: back?.title,
    }) ?? (canGoBack && options.headerBackVisible !== false ? <BackLink /> : null);
  const right = options.headerRight?.({
    tintColor,
    canGoBack,
  });

  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + BAR_HEIGHT, backgroundColor: theme.background }]}>
      <View style={styles.column}>
        {left != null ? <View style={styles.back}>{left}</View> : null}
        {title.length > 0 ? (
          <ThemedText accessibilityRole="header" numberOfLines={1} style={[styles.title, options.headerTitleStyle]}>
            {title}
          </ThemedText>
        ) : (
          <View style={styles.title} />
        )}
        {right != null ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    justifyContent: 'flex-end',
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  back: {
    marginRight: Spacing.two,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: Platform.OS === 'ios' ? 17 : Platform.OS === 'android' ? 20 : 18,
    lineHeight: Platform.OS === 'ios' ? 22 : Platform.OS === 'android' ? 26 : 24,
    fontWeight: Platform.OS === 'ios' ? '700' : '500',
  },
  right: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.two,
  },
});
