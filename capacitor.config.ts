import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Must match the Android package in google-services.json
  // (com.abogicstudio.activity) or Firebase native calls fail.
  appId: 'com.abogicstudio.activity',
  appName: 'daily-workout',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      providers: ['google.com']
    }
  }
};

export default config;
