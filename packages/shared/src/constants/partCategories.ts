import type { Vehicle } from '../types';

// The part categories an owner picks from when asking OnMart for a part: one list per kind of vehicle (not the service
// categories a garage is booked by). The order is an estimate of how often each is asked for; the first ones show before "+N".
// The Sinhala names and example parts are still to be checked with parts shops.

export type PartCategoryOption = {
  id: string;
  /** The full name. */
  si: string;
  /** The short name under a tile. */
  short: string;
  /** Common parts offered as chips. Canonical names (see PART_CATEGORY) where one exists, so demo shops can answer. */
  parts: string[];
  /** The shops' older category (SERVICE_CATEGORIES id) these parts are sold under. */
  serviceCategoryId: string;
  /** The parts taxonomy group shops list in their catalogue, where there is one. */
  groupId?: string;
};

const cat = (id: string, si: string, short: string, serviceCategoryId: string, groupId: string | undefined, parts: string[]): PartCategoryOption => ({ id, si, short, serviceCategoryId, groupId, parts });

const CAR: PartCategoryOption[] = [
  cat('brakes', 'බ්‍රේක්', 'බ්‍රේක්', '7', 'brakes', ['Brake pads (front)', 'Brake pads (rear)', 'Brake disc', 'Brake shoes', 'Brake caliper']),
  cat('oils', 'තෙල් සහ පෙරහන්', 'තෙල් / ෆිල්ටර්', '14', 'fluids', ['Engine oil 4L', 'Oil filter', 'Air filter', 'Cabin filter', 'Gear oil', 'Coolant', 'Brake fluid']),
  cat('engine', 'එන්ජින්', 'එන්ජින්', '1', 'engine', ['Timing belt', 'Fan belt', 'Gasket set', 'Engine mount', 'Water pump', 'Pistons & rings', 'Turbocharger']),
  cat('suspension', 'සස්පෙන්ෂන් සහ ස්ටියරින්', 'සස්පෙන්ෂන්', '7', 'suspension', ['Shock absorbers (pair)', 'Ball joint', 'Tie rod end', 'Wheel bearing', 'Rubber bushings', 'Steering rack']),
  cat('electrical', 'විදුලි සහ ECU', 'විදුලි / ECU', '2', 'electrical', ['Alternator', 'Starter motor', 'Spark plugs (set)', 'O2 sensor', 'ECU', 'Wiper blades']),
  cat('battery', 'බැටරි', 'බැටරි', '11', 'battery', ['Battery 12V 45Ah', 'Battery terminals', 'Battery charger']),
  cat('lights', 'ලයිට්', 'ලයිට්', '2', 'lighting', ['Headlight', 'Tail light', 'Fog lamp', 'Indicator light', 'Bulbs']),
  cat('cooling', 'කූලින් සහ A/C', 'කූලින් / A/C', '4', 'cooling', ['Radiator', 'Radiator fan', 'Radiator hose', 'AC compressor', 'AC condenser', 'AC gas']),
  cat('body', 'බඩි කොටස්', 'බඩි', '8', 'body', ['Bumper', 'Front grille', 'Bonnet', 'Door', 'Fender', 'Trims']),
  cat('glass', 'වීදුරු සහ කැඩපත්', 'වීදුරු', '8', 'glass', ['Windscreen', 'Door glass', 'Rear glass', 'Side mirror']),
  cat('tyres', 'ටයර් සහ රෝද', 'ටයර් / රෝද', '6', 'tyres', ['Tyres', 'Alloy wheel', 'Wheel nuts']),
  cat('gearbox', 'ගියර් සහ ක්ලච්', 'ගියර් / ක්ලච්', '1', 'transmission', ['Clutch plate', 'Flywheel', 'CV joint', 'Drive shaft', 'Gearbox parts']),
  cat('exhaust', 'එග්සෝස්ට් සහ ඉන්ධන', 'එග්සෝස්ට්', '1', 'exhaust', ['Silencer', 'Fuel pump', 'Fuel injectors', 'Carburettor']),
  cat('hybrid', 'හයිබ්‍රිඩ් / EV', 'හයිබ්‍රිඩ් / EV', '3', 'hybrid', ['Hybrid battery', 'Inverter', 'EV charger']),
  cat('interior', 'ඇතුළත කොටස්', 'ඇතුළත', '8', 'interior', ['Seats', 'Floor mats', 'Dashboard parts', 'Steering wheel']),
  cat('safety', 'ආරක්ෂණ කොටස්', 'ආරක්ෂණ', '2', undefined, ['Airbag', 'Seat belt']),
  cat('locks', 'දොර, ලොක් සහ යතුරු', 'ලොක් / යතුරු', '2', undefined, ['Window motor', 'Window regulator', 'Door lock', 'Key']),
  cat('units', 'සම්පූර්ණ එන්ජින් සහ කට්', 'කට් කොටස්', '1', undefined, ['Complete engine', 'Complete gearbox', 'Front cut', 'Rear cut']),
  cat('accessories', 'උපාංග සහ ඕඩියෝ', 'උපාංග', '2', 'accessories', ['Audio screen', 'Speakers', 'Reverse camera', 'Alarm']),
];

/** Extra common parts a van or pickup has, added under the car categories. */
const VAN_EXTRA: Record<string, string[]> = { body: ['Sliding door', 'Rear body panel'], suspension: ['Leaf spring'], gearbox: ['Differential'] };

const BIKE: PartCategoryOption[] = [
  cat('brakes', 'බ්‍රේක්', 'බ්‍රේක්', '7', 'brakes', ['Brake pads (front)', 'Brake shoes', 'Brake disc', 'Brake cable', 'Brake lever']),
  cat('oils', 'තෙල් සහ පෙරහන්', 'තෙල් / ෆිල්ටර්', '14', 'fluids', ['Engine oil', 'Oil filter', 'Air filter', 'Brake fluid']),
  cat('drive', 'චේන්, ක්ලච් සහ CVT', 'චේන් / CVT', '1', 'motorbike', ['Chain & sprocket set', 'Clutch plate', 'CVT drive belt', 'CVT rollers']),
  cat('tyres', 'ටයර්, ටියුබ් සහ රිම්', 'ටයර් / රිම්', '6', 'tyres', ['Tyres', 'Tube', 'Rim', 'Spokes', 'Wheel bearing']),
  cat('electrical', 'බැටරි සහ විදුලි', 'බැටරි / විදුලි', '2', 'electrical', ['Battery', 'Spark plug', 'Ignition coil', 'CDI / ECU', 'Charging coil', 'Switches']),
  cat('engine', 'එන්ජින්', 'එන්ජින්', '1', 'engine', ['Cylinder kit', 'Piston', 'Gasket set', 'Valves']),
  cat('lights', 'ලයිට් සහ මීටර්', 'ලයිට් / මීටර්', '2', 'lighting', ['Headlight', 'Indicator light', 'Bulbs', 'Speed meter']),
  cat('fuel', 'ඉන්ධන පද්ධතිය', 'ඉන්ධන', '1', undefined, ['Carburettor', 'Fuel pump', 'Fuel injectors', 'Tank cap']),
  cat('suspension', 'සස්පෙන්ෂන් සහ හැන්ඩ්ල්', 'සස්පෙන්ෂන්', '7', 'suspension', ['Front forks', 'Fork seals', 'Rear shock', 'Handlebar']),
  cat('body', 'බඩි සහ කැඩපත්', 'බඩි / කැඩපත්', '8', 'motorbike', ['Fuel tank', 'Side covers', 'Mudguard', 'Side mirror', 'Seat']),
  cat('locks', 'කේබල්, ලොක් සහ යතුරු', 'කේබල් / ලොක්', '2', undefined, ['Throttle cable', 'Clutch cable', 'Ignition switch', 'Lock set']),
  cat('exhaust', 'එක්සෝස්ට්', 'එක්සෝස්ට්', '1', 'exhaust', ['Silencer', 'Exhaust pipe']),
  cat('accessories', 'උපාංග', 'උපාංග', '2', 'accessories', ['Carrier', 'Crash guard', 'Phone holder']),
];

const THREE_WHEELER: PartCategoryOption[] = [
  cat('brakes', 'බ්‍රේක්', 'බ්‍රේක්', '7', 'brakes', ['Brake shoes', 'Brake drum', 'Brake cylinder', 'Brake cable', 'Brake hose']),
  cat('oils', 'තෙල් සහ පෙරහන්', 'තෙල් / ෆිල්ටර්', '14', 'fluids', ['Engine oil', 'Gear oil', 'Oil filter', 'Air filter', 'Brake fluid']),
  cat('gearbox', 'ක්ලච් සහ ගියර්', 'ක්ලච් / ගියර්', '1', 'transmission', ['Clutch plate', 'Clutch cable', 'Gearbox parts', 'Drive shaft']),
  cat('engine', 'එන්ජින්', 'එන්ජින්', '1', 'engine', ['Cylinder kit', 'Piston', 'Gasket set', 'Engine mount']),
  cat('tyres', 'ටයර් සහ රෝද', 'ටයර් / රෝද', '6', 'tyres', ['Tyres', 'Tube', 'Rim', 'Wheel hub', 'Wheel bearing']),
  cat('electrical', 'බැටරි සහ විදුලි', 'බැටරි / විදුලි', '2', 'electrical', ['Battery', 'Spark plug', 'Ignition coil', 'CDI / ECU', 'Starter motor']),
  cat('suspension', 'සස්පෙන්ෂන් සහ ස්ටියරින්', 'සස්පෙන්ෂන්', '7', 'suspension', ['Front fork', 'Shock absorber', 'Rubber bushings', 'Handlebar']),
  cat('fuel', 'ඉන්ධන සහ LPG', 'ඉන්ධන / LPG', '1', undefined, ['Carburettor', 'Fuel injectors', 'Fuel pump', 'LPG kit parts']),
  cat('lights', 'ලයිට් සහ මීටර්', 'ලයිට් / මීටර්', '2', 'lighting', ['Headlight', 'Tail light', 'Indicator light', 'Speed meter', 'Taxi meter']),
  cat('body', 'බඩි, වීදුරු සහ කැඩපත්', 'බඩි / වීදුරු', '8', 'threewheeler', ['Body panel', 'Door', 'Windscreen', 'Side mirror']),
  cat('hood', 'හූඩ්, සීට් සහ කුෂන්', 'හූඩ් / සීට්', '8', 'threewheeler', ['Canvas hood', 'Side curtains', 'Seat', 'Cushions']),
  cat('locks', 'කේබල්, ලොක් සහ යතුරු', 'කේබල් / ලොක්', '2', undefined, ['Control cables', 'Ignition switch', 'Lock set']),
  cat('exhaust', 'එක්සෝස්ට්', 'එක්සෝස්ට්', '1', 'exhaust', ['Silencer', 'Exhaust pipe']),
  cat('accessories', 'උපාංග', 'උපාංග', '2', 'accessories', ['Audio set', 'Carrier', 'Guards', 'Floor mats']),
];

const heavy = (bus: boolean): PartCategoryOption[] => [
  cat('brakes', 'බ්‍රේක් සහ එයාර් පද්ධතිය', 'බ්‍රේක් / එයාර්', '7', 'brakes', ['Brake lining', 'Brake drum', 'Brake booster', 'Air compressor', 'Air valve']),
  cat('oils', 'තෙල් සහ පෙරහන්', 'තෙල් / ෆිල්ටර්', '14', 'fluids', ['Engine oil', 'Oil filter', 'Fuel filter', 'Air filter', 'Water separator']),
  cat('engine', 'එන්ජින් සහ ටර්බෝ', 'එන්ජින් / ටර්බෝ', '1', 'engine', ['Overhaul kit', 'Gasket set', 'Water pump', 'Turbocharger', 'Fan belt']),
  cat('fuel', 'ඩීසල් ඉන්ධන පද්ධතිය', 'ඩීසල් පද්ධතිය', '1', undefined, ['Fuel injectors', 'Injector pump', 'Supply pump']),
  cat('tyres', 'ටයර් සහ රෝද', 'ටයර් / රෝද', '6', 'tyres', ['Tyres', 'Tube', 'Rim', 'Wheel studs']),
  cat('electrical', 'බැටරි සහ විදුලි', 'බැටරි / විදුලි', '2', 'electrical', ['Battery', 'Alternator', 'Starter motor', 'Sensors', 'Control unit']),
  cat('suspension', 'සස්පෙන්ෂන් සහ ස්ටියරින්', 'සස්පෙන්ෂන්', '7', 'suspension', ['Leaf spring', 'Shock absorber', 'Air suspension parts', 'Steering parts']),
  cat('gearbox', 'ක්ලච් සහ ගියර්', 'ක්ලච් / ගියර්', '1', 'transmission', ['Clutch kit', 'Gearbox parts']),
  cat('propeller', 'ප්‍රොපෙලර් ෂාෆ්ට් සහ ඩිෆරන්ෂල්', 'ඩිෆරන්ෂල්', '1', 'transmission', ['Propeller shaft joint', 'Axle', 'Differential parts']),
  cat('cooling', 'කූලින් සහ A/C', 'කූලින් / A/C', '4', 'cooling', ['Radiator', 'Radiator fan', 'Radiator hose', 'AC parts']),
  cat('lights', 'ලයිට්', 'ලයිට්', '2', 'lighting', ['Headlight', 'Tail light', 'Side marker light']),
  cat('body', 'කැබ්, බඩි සහ වීදුරු', 'කැබ් / බඩි', '8', 'body', ['Cab panel', 'Windscreen', 'Side mirror', 'Door']),
  bus
    ? cat('chassis', 'චැසි කොටස්', 'චැසි', '1', undefined, ['Chassis parts'])
    : cat('chassis', 'චැසි, බැරල් සහ හයිඩ්‍රොලික්', 'චැසි / බැරල්', '1', undefined, ['Chassis parts', 'Tipper body', 'Hydraulic ram', 'Hydraulic pump']),
  cat('exhaust', 'එක්සෝස්ට්', 'එක්සෝස්ට්', '1', 'exhaust', ['Silencer', 'Exhaust pipe', 'Emission parts']),
  ...(bus ? [cat('bus', 'බස් කොටස්', 'බස් කොටස්', '8', undefined, ['Passenger door', 'Passenger seat', 'Bus body fitting'])] : []),
];

const EV_TWO_THREE = cat('ev', 'EV කොටස්', 'EV කොටස්', '3', 'hybrid', ['EV battery', 'EV motor', 'EV controller', 'EV charger']);
/** What an electric vehicle has no use for. */
const COMBUSTION = ['engine', 'fuel', 'exhaust'];

/** The part categories to show for a vehicle, most asked first. */
export const partCategoriesFor = (type: string, fuelType?: Vehicle['fuelType']): PartCategoryOption[] => {
  const electric = fuelType === 'Electric';
  if (type === 'Motorbike' || type === 'Three-wheeler') {
    let list = type === 'Motorbike' ? BIKE : THREE_WHEELER;
    // A diesel has no spark plug, carburettor or LPG parts.
    if (fuelType === 'Diesel') list = list.map((c) => ({ ...c, parts: c.parts.filter((p) => !/spark|ignition coil|carburettor|lpg/i.test(p)) }));
    return electric ? [EV_TWO_THREE, ...list.filter((c) => !COMBUSTION.includes(c.id))] : list;
  }
  if (type === 'Bus' || type === 'Lorry') return heavy(type === 'Bus');
  const list = type === 'Van' || type === 'Pickup' ? CAR.map((c) => (VAN_EXTRA[c.id] ? { ...c, parts: [...c.parts, ...VAN_EXTRA[c.id]] } : c)) : CAR;
  return electric ? list.filter((c) => !COMBUSTION.includes(c.id)) : list;
};

/** The category a part request shows to a shop: the one the buyer picked, else the vehicle's category that lists the part by name. */
export const partCategoryOfBrief = (brief: { name: string; partCategoryId?: string; vehicle: { type: string } }): PartCategoryOption | undefined => {
  const list = partCategoriesFor(brief.vehicle.type);
  if (!brief.partCategoryId) return list.find((c) => c.parts.includes(brief.name));
  // Only an electric bike or three-wheeler has the EV category, and the request does not carry the fuel type.
  return brief.partCategoryId === EV_TWO_THREE.id ? EV_TWO_THREE : list.find((c) => c.id === brief.partCategoryId);
};
