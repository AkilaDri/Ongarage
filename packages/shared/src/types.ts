export type LatLng = { latitude: number; longitude: number };

export type PickedLocation = { address: string; coords: LatLng };

export type Vehicle = {
  id: string;
  name: string;
  plate: string;
  type: string;
};

export type Garage = {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  distance: number;
  status: 'open' | 'closed';
  phone: string;
  address: string;
  coords: LatLng;
  reviews_text?: string;
  photos?: string[];
};

export type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
};

export type Bid = {
  id: string;
  garageName: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  coords: LatLng;
  price: number;
  warrantyMonths: number;
  estHours: number;
  submittedAt: number;
};

export type RepairJob = {
  id: string;
  categoryId: string;
  description: string;
  vehicleId: string;
  sparePart: string;
  doorstep: boolean;
  biddingHours: number;
  submittedAt: number;
  address: string;
  coords: LatLng;
  bids: Bid[];
  acceptedBidId?: string;
};

export type JobDraft = Pick<RepairJob, 'categoryId' | 'description' | 'vehicleId'> & { replacesJobId?: string };

export type BreakdownType =
  | 'Tyre Puncture'
  | 'Engine Problem'
  | 'Brake Issue'
  | 'Gearbox Issue'
  | 'Electrical Issue'
  | 'Fuel Empty';

export type SOSRequest = {
  location: string;
  vehicleId: string;
  breakdownType: BreakdownType;
  coordinates?: LatLng;
};

export type Mechanic = {
  id: string;
  name: string;
  distance: number;
  eta: number;
  phone: string;
  specialty: string;
  callMessage: string;
  coords: LatLng;
};
