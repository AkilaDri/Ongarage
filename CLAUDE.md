# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## OnGarage monorepo

Two Expo (SDK 57, React Native 0.86, React 19.2, TypeScript) apps that are the two sides of one marketplace, plus the code they share. npm workspaces; one `node_modules` and one `package-lock.json` at the root.

```
apps/user       vehicle-owner app (SOS, post repair jobs, receive bids, activity, profile)
apps/garage     garage-owner app — currently a 4-tab shell; features not built yet
packages/shared @ongarage/shared — types, theme engine + palettes, fonts, glass UI kit,
                line icons, Google Maps helpers, the service-category taxonomy
```

The garage app is the counterpart of every user-app flow: SOS request → accept/quote → assign mechanic + live location → arrived → repairing → complete → scan the owner's QR; posted job → bid (price, warranty, est. time) → booking; garage profile = the `GarageCard` owners see. Today the "other side" is simulated inside the user app (`apps/user/src/context/BidsContext.tsx` invents bids on a timer; `SOSFlowScreen` simulates acceptance/tracking). Real cross-app behaviour needs a backend; the types in `packages/shared/src/types.ts` are meant to be that contract.

## Commands (run from the repo root)

```bash
npm install            # installs every workspace
npm run user           # Expo dev server for the owner app   (npm run user:web for web)
npm run garage         # Expo dev server for the garage app  (npm run garage:web)
npm run typecheck      # tsc --noEmit in every workspace
```

Run both apps at once on different ports, e.g. `npm run start -w @ongarage/user -- --port 8083` and `npm run start -w @ongarage/garage -- --port 8084`. Add a dependency to one app with `npm install <pkg> -w @ongarage/user` (keep versions identical across apps so React/React Native are hoisted once). Clear Metro's cache with `-- --clear` after moving files between packages.

## Rules that span the repo

- **Put code in `packages/shared` only if both apps need it.** Screens, mock data and app-specific stores stay in their app. Import shared code as `@ongarage/shared` (one barrel, `src/index.ts`); the package ships TypeScript source, Metro compiles it.
- **Theming**: never hardcode surface/text colours. Use `Colors.*` and wrap every `StyleSheet.create` in `themedStyles(() => …)` so it is rebuilt per theme. `Colors` is a proxy over the active palette; `ThemeProvider` switches it and re-renders the tree. Values that must read the palette outside a style factory (e.g. `glassStyle()`) are functions, not constants. Light/dark palettes live in `packages/shared/src/theme/colors.ts`. White text on fixed-colour gradients/pins is the intended exception.
- **UI language** is Sinhala (Noto Sans Sinhala via `FONTS`); English only for proper nouns and category names.
- **Google Maps**: each app reads `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from its own `.env` (git-ignored; see `.env.example`). Maps render as Static Maps images with overlays projected by `projectToMap`; the Google Cloud project currently has billing disabled, so maps fall back to a dot grid.
