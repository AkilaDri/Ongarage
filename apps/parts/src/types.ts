import type { LatLng, PartQuote, PartsGarage, PartsRequest, PartsShop, PartType } from '@ongarage/shared';

// Shop-side views of the parts records the garage app creates (see the shared
// PartsRequest / PartQuote / PartsOrder contract). When a backend exists these are
// what a shop receives for each garage action.

export type { Notice } from '@ongarage/shared';

export type QuoteType = Exclude<PartType, 'GarageChoice'>;

/** A garage's parts request, as it reaches this shop. */
export type IncomingRequest = PartsRequest & {
  garage: PartsGarage;
  distanceKm: number;
  receivedAt: number;
  /** How many other shops have quoted so far (count only; their prices stay private). */
  otherQuotes: number;
  /** Simulation only: the best rival total the garage will compare against. */
  rivalBest: number;
  /** Simulation only: the garage reports this problem on delivery. */
  simProblem?: string;
  /** The shop chose not to quote. */
  passed?: boolean;
};

export type QuoteStatus = 'pending' | 'won' | 'lost' | 'withdrawn';

/** This shop's quote; the garage sees it as a shared PartQuote. */
export type MyQuote = PartQuote & { status: QuoteStatus; note?: string; request: IncomingRequest };

/**
 * The shop's view of an order. It maps onto the garage's PartsOrderStatus, plus two
 * shop-only steps: 'packing' (garage still sees it as confirmed, not yet sent) and
 * 'returned' (a reported problem the shop has taken back).
 */
export type ShopOrderStatus = 'confirming' | 'packing' | 'dispatched' | 'arrived' | 'received' | 'unavailable' | 'problem' | 'returned';

export type ShopOrder = {
  id: string;
  quote: MyQuote;
  status: ShopOrderStatus;
  placedAt: number;
  /** The shop must confirm stock by then, or the order lapses (and counts against its rating). */
  confirmBy: number;
  delivery?: {
    method: 'courier' | 'shop';
    courier?: string;
    rider: { name: string; phone: string };
    etaAt: number;
    trackingUrl?: string;
  };
  receivedAt?: number;
  problem?: string;
  /** What the shop keeps: parts + its own delivery fee (a courier's fee goes to the courier). */
  payout?: number;
  /** The garage's rating of this order. */
  rating?: number;
};

export type StockVariant = { type: QuoteType; price: number; qty: number; brand?: string };
export type StockItem = { id: string; name: string; categoryId: string; variants: StockVariant[] };

export type DeliveryStaff = { id: string; name: string; phone: string };

export type ShopProfile = PartsShop & {
  coords: LatLng;
  openHours: string;
  /** Requests come only from garages within this distance. */
  deliveryRadiusKm: number;
  /** Part types this shop sells. */
  types: QuoteType[];
  /** Service categories it stocks parts for (SERVICE_CATEGORIES ids). */
  categories: string[];
  courierEnabled: boolean;
  ownDelivery: boolean;
  staff: DeliveryStaff[];
};

export type ShopReview = { id: string; garage: string; rating: number; text: string; at: number; reply?: { text: string; at: number } };
