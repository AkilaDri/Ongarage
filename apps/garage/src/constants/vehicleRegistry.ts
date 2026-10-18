import type { CustomerVehicle } from '../types';

type Registration = Omit<CustomerVehicle, 'name' | 'plate' | 'type'>;

/**
 * What an owner enters when they register a vehicle in their app (registration no., chassis,
 * engine, make, model, colour, insurance), keyed by plate. The first four are the owner app's
 * own seeded vehicles, so a job from the owner app shows the same details on the job card.
 * A backend sends these with every job.
 */
export const VEHICLE_REGISTRY: Record<string, Registration> = {
  'CAD-8821': { registrationNo: 'CAD-8821', chassisNo: 'JMBF05090D6226789', engineNo: '3AZFE-2235601', make: 'Toyota', model: 'Premio', color: 'Silver', insuranceNo: 'INS-2024-001' },
  'KV-4412': { registrationNo: 'KV-4412', chassisNo: 'MA3FG50P8KF123456', engineNo: 'F6A-1234567', make: 'Suzuki', model: 'Alto K6A', color: 'White', insuranceNo: 'INS-2024-002' },
  'WP-1029': { registrationNo: 'WP-1029', chassisNo: 'FN10P000100789012', engineNo: 'CK10-7654321', make: 'Nissan', model: 'March K11', color: 'Blue', insuranceNo: 'INS-2024-003' },
  'CAB-5510': { registrationNo: 'CAB-5510', chassisNo: 'JHMZE3H56BM100234', engineNo: 'R18A-9876543', make: 'Honda', model: 'Vezel', color: 'Red', insuranceNo: 'INS-2024-004' },
  'CBD-7712': { registrationNo: 'CBD-7712', chassisNo: 'NHP100-3004417', engineNo: '1NZ-FXE-5521904', make: 'Toyota', model: 'Aqua', color: 'Pearl White', insuranceNo: 'INS-2024-011' },
  'CAA-3398': { registrationNo: 'CAA-3398', chassisNo: 'NZE141-9087712', engineNo: '1NZ-FE-7730154', make: 'Toyota', model: 'Axio', color: 'Grey', insuranceNo: 'INS-2024-012' },
  'CAE-1122': { registrationNo: 'CAE-1122', chassisNo: 'KSP130-2214507', engineNo: '1KR-FE-4409821', make: 'Toyota', model: 'Vitz', color: 'Black', insuranceNo: 'INS-2024-013' },
  'CAD-4410': { registrationNo: 'CAD-4410', chassisNo: 'ZRT260-3318805', engineNo: '3ZR-FAE-1102936', make: 'Toyota', model: 'Premio', color: 'Pearl White', insuranceNo: 'INS-2024-014' },
  'CAB-7781': { registrationNo: 'CAB-7781', chassisNo: 'RU1-1204432', engineNo: 'L15B-6618027', make: 'Honda', model: 'Vezel', color: 'Blue', insuranceNo: 'INS-2024-015' },
  'CAF-4455': { registrationNo: 'CAF-4455', chassisNo: 'ZC72S-5503316', engineNo: 'K12B-2207741', make: 'Suzuki', model: 'Swift', color: 'Red', insuranceNo: 'INS-2024-016' },
  'CAD-9087': { registrationNo: 'CAD-9087', chassisNo: 'NRE210-8807213', engineNo: '2NR-FKE-3319075', make: 'Toyota', model: 'Corolla', color: 'Silver', insuranceNo: 'INS-2024-017' },
  'CAK-6610': { registrationNo: 'CAK-6610', chassisNo: 'GP5-1008834', engineNo: 'LEB-4402168', make: 'Honda', model: 'Fit GP5', color: 'White', insuranceNo: 'INS-2024-018' },
  'CAP-2045': { registrationNo: 'CAP-2045', chassisNo: 'MH55S-1107420', engineNo: 'R06A-5530912', make: 'Suzuki', model: 'Wagon R', color: 'Grey', insuranceNo: 'INS-2024-019' },
  'BCD-2231': { registrationNo: 'BCD-2231', chassisNo: 'MD2A11AZ-4403175', engineNo: 'DTSI-2209416', make: 'Bajaj', model: 'Pulsar 150', color: 'Black', insuranceNo: 'INS-2024-020' },
};
