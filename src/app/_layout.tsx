import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { NewDeckButton } from '@/components/new-deck-button';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen
          name="index"
          options={{
            title: 'Mazos',
            headerRight: () => <NewDeckButton />,
          }}
        />
        <Stack.Screen name="deck/form" options={{ title: 'Mazo' }} />
        <Stack.Screen name="deck/[id]/index" options={{ title: 'Mazo' }} />
        <Stack.Screen name="deck/[id]/card-form" options={{ title: 'Tarjeta' }} />
        <Stack.Screen name="deck/[id]/study" options={{ title: 'Estudiar' }} />
        <Stack.Screen name="study/new" options={{ title: 'Nueva sesión' }} />
        <Stack.Screen name="study/preview" options={{ title: 'Sesión' }} />
        <Stack.Screen name="study/session" options={{ title: 'Estudiar' }} />
        <Stack.Screen name="maintenance/index" options={{ title: 'Mantenimiento' }} />
        <Stack.Screen name="maintenance/cards" options={{ title: 'Tarjetas' }} />
        <Stack.Screen name="unlinked" options={{ title: 'Sin mazo' }} />
        <Stack.Screen name="card-form" options={{ title: 'Tarjeta' }} />
      </Stack>
    </ThemeProvider>
  );
}
