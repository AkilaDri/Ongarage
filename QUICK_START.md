# Quick Start Guide - OnGarage User App

## Step 1: Navigate to Project
```powershell
cd "E:\OnGarage User App\ongarage-app"
```

## Step 2: Start Development Server
```bash
npm start
```

You'll see output with options:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator  
- Press `w` for Web version
- Press `j` for Expo Go (scan QR code)

## Step 3: Choose Your Testing Method

### Option A: Physical Device (Easiest)
1. Download Expo Go app (iOS App Store or Google Play)
2. Scan the QR code displayed in terminal
3. App opens instantly on your phone

### Option B: iOS Simulator (Mac only)
```bash
npm run ios
```

### Option C: Android Emulator
```bash
npm run android
```

### Option D: Web Browser
```bash
npm run web
```

## File Structure Overview

```
ongarage-app/
├── src/
│   ├── app/          # Navigation and routing
│   ├── components/   # Reusable UI components
│   ├── screens/      # Full-screen components
│   ├── services/     # API & external services
│   └── utils/        # Helper functions
├── assets/           # Images, fonts, icons
├── app.json          # Expo configuration
└── package.json      # Dependencies
```

## Common Commands

```bash
# Start development server
npm start

# Run on specific platform
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web browser

# Install new package
npm install expo-router    # Example: navigation library

# Install dev dependency
npm install --save-dev prettier

# Format code
npx prettier --write .

# Type checking (if TypeScript)
npm run type-check
```

## Next Steps

1. **Configure API**: Update `.env` file with your API endpoints
2. **Add Navigation**: Install expo-router for navigation
   ```bash
   npm install expo-router expo-linking
   ```
3. **Add State Management**: Choose Redux, Zustand, or Context API
4. **Style Components**: Use StyleSheet or Tailwind CSS (Nativewind)
5. **Build for Production**: Follow [EAS Build docs](https://docs.expo.dev/build/introduction/)

## Troubleshooting

### Port Already in Use
```bash
# Use different port
npm start -- --port 19000
```

### Clear Cache
```bash
npm start -- --clear
```

### Reinstall Dependencies
```bash
rm -r node_modules package-lock.json
npm install
```

### Module Not Found
```bash
npm install
npx expo install [module-name]
```

## Resources

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [TypeScript + React Native](https://reactnative.dev/docs/typescript)
- [EAS Build](https://docs.expo.dev/build/introduction/)

Happy coding! 🚀
