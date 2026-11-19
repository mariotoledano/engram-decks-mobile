import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ArrowLeftIcon } from '@/components/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function HomeBackLink() {
  const theme = useTheme();

  return (
    <Link href="/" dismissTo asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Engram Decks"
        hitSlop={8}
        style={StyleSheet.flatten([styles.button, Platform.OS === 'web' ? styles.web : null])}>
        <ArrowLeftIcon color={theme.text} size={22} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    marginLeft: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  web: {
    cursor: 'pointer',
  },
});
