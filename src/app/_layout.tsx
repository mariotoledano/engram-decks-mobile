import 'react-native-gesture-handler';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HomeBackLink } from '@/components/home-back-link';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.background },
          }}>
          <Stack.Screen name="index" options={{ title: 'Engram Decks' }} />
          <Stack.Screen
            name="decks"
            options={{
              title: 'Mazos',
              headerBackVisible: false,
              headerLeft: () => <HomeBackLink />,
            }}
          />
          <Stack.Screen
            name="cards"
            options={{
              title: 'Tarjetas',
              headerBackVisible: false,
              headerLeft: () => <HomeBackLink />,
            }}
          />
          <Stack.Screen
            name="free-study"
            options={{
              title: 'Estudio libre',
              headerBackVisible: false,
              headerLeft: () => <HomeBackLink />,
            }}
          />
          <Stack.Screen name="study/free" options={{ title: '' }} />
          <Stack.Screen name="study/[deckId]" options={{ title: '' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
