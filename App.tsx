import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/tokens';
import { SoundboardScreen } from './src/screens/SoundboardScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SoundboardScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
