// Code shared by the OnGarage apps: vehicle owner (apps/user), garage (apps/garage),
// parts shop (apps/parts) and technician (apps/tech).
// Keep app-specific screens, mock data and stores in the apps themselves.

export * from './types';

export * from './theme/colors';
export * from './theme/fonts';
export * from './theme/ThemeContext';

export * from './constants/categories';
export * from './constants/breakdowns';
export * from './constants/vehicles';

export * from './maps/googleMaps';
export * from './maps/GoogleMap';

export * from './utils/format';

// Business rules every app agrees on (trust, levels, fair share, guarantee, closing codes).
export * from './marketplace/trust';
export * from './marketplace/levels';
export * from './marketplace/fairness';
export * from './marketplace/guarantee';
export * from './marketplace/closeCode';

// AI decisions layer (rules today; Claude / Laya through the back end later).
export * from './ai';

export * from './ui/BottomNav';
export * from './ui/CloseCode';
export * from './ui/GarageCard';
export * from './ui/Glass';
export * from './ui/Icons';
export * from './ui/NoticeToast';
export * from './ui/PhotoStrip';
export * from './ui/Sheet';
export * from './ui/Slider';
export * from './ui/StepProgress';
export * from './ui/SwipeCard';
export * from './ui/ThemeToggle';
export * from './ui/Visuals';
export * from './ui/VoiceNotePlayer';
