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
export * from './constants/martShops';
export * from './constants/martFitment';
export * from './constants/serviceKits';
export * from './constants/partsTaxonomy';
export * from './constants/martPromos';

export * from './maps/googleMaps';
export * from './maps/GoogleMap';

export * from './utils/format';
export * from './utils/photos';
export * from './ui/VoiceNoteField';
export * from './ui/PartTypeChip';

// Business rules every app agrees on (trust, levels, fair share, guarantee, closing codes).
export * from './marketplace/trust';
export * from './marketplace/relationship';
export * from './marketplace/levels';
export * from './marketplace/fairness';
export * from './marketplace/guarantee';
export * from './marketplace/closeCode';
export * from './marketplace/chat';
export * from './marketplace/workshop';
export * from './marketplace/partPrices';
export * from './marketplace/partsMart';
export * from './marketplace/deals';
export * from './marketplace/referral';
export * from './marketplace/partsCatalogue';
export * from './marketplace/service';
export * from './marketplace/travel';
export * from './marketplace/cancel';
export * from './marketplace/fitting';
export * from './marketplace/payment';
export * from './marketplace/reliability';
export * from './marketplace/customerRating';
export * from './marketplace/inquiry';
export * from './marketplace/partsBatch';
export * from './marketplace/jobUpdates';

// AI decisions layer (rules today; Claude / Laya through the back end later).
export * from './ai';

export * from './ui/BottomNav';
export * from './ui/UrgentBar';
export * from './ui/PinnedEdge';
export * from './ui/TitleBand';
export * from './ui/CloseCode';
export * from './ui/PurchaseCode';
export * from './ui/ShopCard';
export * from './ui/MartBits';
export * from './ui/PartBriefForm';
export * from './ui/GarageCard';
export * from './ui/LevelBadge';
export * from './ui/Glass';
export * from './ui/Icons';
export * from './ui/OnMartIcon';
export * from './ui/NoticeToast';
export * from './ui/PhotoStrip';
export * from './ui/CountdownPill';
export * from './ui/TimeClock';
export * from './ui/Sheet';
export * from './ui/Slider';
export * from './ui/StepProgress';
export * from './ui/SwipeCard';
export * from './ui/ThemeToggle';
export * from './ui/Visuals';
export * from './ui/VoiceNotePlayer';

// Workshop job forms the garage and technician apps share.
export * from './ui/workshop/CheckInSheet';
export * from './ui/workshop/ShopRecommender';
export * from './ui/workshop/DiagnosisSheet';
export * from './ui/workshop/HandoverSheet';
export * from './ui/workshop/CloseJobSheet';
export * from './ui/workshop/PaymentReceivedSheet';
export * from './ui/workshop/ExtraByPhoneSheet';
export * from './ui/LkPlate';
export * from './ui/VehicleIcon3D';
export * from './ui/chat/ChatSheet';
export * from './ui/chat/useChatStore';export * from './utils/initials';
export * from './ui/chat/ChatInboxSheet';
export * from './ui/chat/jobRecord';
export * from './ui/chat/chatTerms';
export * from './ui/chat/CallPill';
export * from './ui/workshop/ServiceRecordFields';
export * from './ui/workshop/JobReportSheet';
export * from './ui/emojiLine';
export * from './ui/OnChatIcon';
export * from './ui/TwinkleStar';
export * from './ui/RelationTag';
