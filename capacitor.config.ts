import type { CapacitorConfig } from '@capacitor/cli';

/*
 * App-store wrapper (Capacitor). The same web app, packaged for iOS and Android.
 *   npm run build:store     → web build with logos off, no service worker, prices from your live site
 *   npx cap add android     → once (needs Android Studio)
 *   npx cap add ios         → once (needs a Mac with Xcode)
 *   npm run cap:sync        → copy the latest build into both projects
 * See README → "Publishing to the App Store and Google Play".
 */
const config: CapacitorConfig = {
  appId: 'app.prepline.mealplanner', // change to a reverse-domain you control before publishing
  appName: 'Prepline',
  webDir: 'dist',
  backgroundColor: '#f6f3ec',
  ios: { contentInset: 'automatic' },
  android: { allowMixedContent: false },
};

export default config;
