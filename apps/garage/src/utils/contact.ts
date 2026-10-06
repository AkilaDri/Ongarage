import { Linking } from 'react-native';
import { directionsUrl } from '@ongarage/shared';
import type { Booking, GarageProfile } from '../types';

/**
 * Who travels for a booking:
 * - doorstep: the owner asked for pickup/doorstep service, so the garage goes to them;
 * - walkin: the owner brings the vehicle, so they get the garage's location;
 * - roadside: an SOS job, done where the vehicle broke down.
 */
export type ServiceMode = 'doorstep' | 'walkin' | 'roadside';

export const serviceMode = (b: Booking): ServiceMode => (b.source === 'sos' ? 'roadside' : b.doorstep ? 'doorstep' : 'walkin');

export const callCustomer = (phone: string) => Linking.openURL(`tel:${phone}`);

export const openDirections = (b: Booking, garage: GarageProfile) => Linking.openURL(directionsUrl(b.coords, garage.coords));

const mapsLink = (g: GarageProfile) => `https://www.google.com/maps/search/?api=1&query=${g.coords.latitude},${g.coords.longitude}`;

/** The message a walk-in customer receives: where to come, when, and who to call on the way. */
export const garageLocationMessage = (g: GarageProfile, b: Booking, when: string) =>
  `${g.name}\n${b.title} · ${when}\n📍 ${g.address}\n${mapsLink(g)}\n📞 ${g.phone} — පැමිණෙන අතරතුර උපදෙස් සඳහා අමතන්න.`;

export const sendGarageLocation = (g: GarageProfile, b: Booking, when: string) =>
  Linking.openURL(`sms:${b.customer.phone}?body=${encodeURIComponent(garageLocationMessage(g, b, when))}`);
