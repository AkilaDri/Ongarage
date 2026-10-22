import type { PartTaxonomyGroup, PartTaxonomyPart, VehicleKind } from '../types';

// The kinds of part a parts shop can say it sells, and the vehicles it sells them for. A shop does not list what is on its
// shelves; it picks the part kinds (and, for each, the makes / models / codes and brands it deals in), and buyers' searches
// are matched against that. The groups follow how a Sri Lankan parts shop is usually organised.

/** Each group maps onto the service category (SERVICE_CATEGORIES id) its parts belong to, so the older category filters keep working. */
export const PART_TAXONOMY_GROUPS: PartTaxonomyGroup[] = [
  { id: 'engine', name: 'Engine parts', si: 'එන්ජින් කොටස්', icon: '⚙️', serviceCategoryId: '1' },
  { id: 'fluids', name: 'Oils & filters', si: 'තෙල් සහ පෙරහන්', icon: '🛢️', serviceCategoryId: '14' },
  { id: 'transmission', name: 'Gearbox & clutch', si: 'ගියර් සහ ක්ලච්', icon: '🕹️', serviceCategoryId: '1' },
  { id: 'brakes', name: 'Brakes', si: 'බ්‍රේක්', icon: '🛑', serviceCategoryId: '7' },
  { id: 'suspension', name: 'Suspension & steering', si: 'සස්පෙන්ෂන් සහ ස්ටියරින්', icon: '🔩', serviceCategoryId: '7' },
  { id: 'lighting', name: 'Lights', si: 'ආලෝක', icon: '💡', serviceCategoryId: '2' },
  { id: 'electrical', name: 'Electrical & ignition', si: 'විදුලි සහ ඉග්නිෂන්', icon: '⚡', serviceCategoryId: '2' },
  { id: 'battery', name: 'Batteries', si: 'බැටරි', icon: '🔋', serviceCategoryId: '11' },
  { id: 'cooling', name: 'Cooling & A/C', si: 'සිසිලන සහ A/C', icon: '❄️', serviceCategoryId: '4' },
  { id: 'exhaust', name: 'Exhaust & fuel', si: 'පිටවන නළ සහ ඉන්ධන', icon: '⛽', serviceCategoryId: '1' },
  { id: 'body', name: 'Body parts', si: 'බඩි කොටස්', icon: '🚗', serviceCategoryId: '8' },
  { id: 'glass', name: 'Glass & mirrors', si: 'වීදුරු සහ කැඩපත්', icon: '🪟', serviceCategoryId: '8' },
  { id: 'tyres', name: 'Tyres & wheels', si: 'ටයර් සහ රෝද', icon: '🛞', serviceCategoryId: '6' },
  { id: 'interior', name: 'Interior', si: 'අභ්‍යන්තර', icon: '💺', serviceCategoryId: '8' },
  { id: 'accessories', name: 'Accessories & audio', si: 'උපාංග සහ ඕඩියෝ', icon: '🔊', serviceCategoryId: '10' },
  { id: 'hybrid', name: 'Hybrid / EV parts', si: 'හයිබ්‍රිඩ් / EV කොටස්', icon: '🔌', serviceCategoryId: '3' },
  { id: 'motorbike', name: 'Motorbike parts', si: 'යතුරුපැදි කොටස්', icon: '🏍️', serviceCategoryId: '1' },
  { id: 'threewheeler', name: 'Three-wheeler parts', si: 'ත්‍රීරෝද කොටස්', icon: '🛺', serviceCategoryId: '1' },
];

// [id, group, English name, Sinhala name, words a buyer may type (English, Singlish, Sinhala), variants]
type Row = [string, string, string, string, string[], string[]?];

const ROWS: Row[] = [
  ['piston-set', 'engine', 'Pistons & rings', 'පිස්ටන් සහ රිං', ['piston', 'piston ring', 'rings', 'පිස්ටන්']],
  ['head-gasket', 'engine', 'Head gasket / gasket set', 'ගැස්කට් සෙට්', ['gasket', 'head gasket', 'ගැස්කට්']],
  ['timing-kit', 'engine', 'Timing belt / chain kit', 'ටයිමින් බෙල්ට් / චේන්', ['timing belt', 'timing chain', 'ටයිමින්']],
  ['water-pump', 'engine', 'Water pump', 'වතුර පොම්පය', ['water pump', 'වතුර පොම්ප']],
  ['oil-pump', 'engine', 'Oil pump', 'ඔයිල් පොම්පය', ['oil pump']],
  ['engine-mount', 'engine', 'Engine / gearbox mounts', 'එන්ජින් මවුන්ට්', ['engine mount', 'mounting', 'මවුන්ට්']],
  ['turbo', 'engine', 'Turbocharger', 'ටර්බෝ', ['turbo', 'ටර්බෝ']],
  ['fan-belt', 'engine', 'Fan / drive belt', 'ෆෑන් බෙල්ට්', ['fan belt', 'drive belt', 'v belt', 'බෙල්ට්']],

  ['engine-oil', 'fluids', 'Engine oil', 'එන්ජින් ඔයිල්', ['engine oil', 'oil', 'ඔයිල්', 'oil change'], ['Mineral', 'Semi-synthetic', 'Fully synthetic']],
  ['gear-oil', 'fluids', 'Gear / transmission oil', 'ගියර් ඔයිල්', ['gear oil', 'atf', 'cvt oil', 'transmission oil']],
  ['oil-filter', 'fluids', 'Oil filter', 'ඔයිල් ෆිල්ටරය', ['oil filter', 'ඔයිල් ෆිල්ටර']],
  ['air-filter', 'fluids', 'Air filter', 'එයාර් ෆිල්ටරය', ['air filter', 'එයාර් ෆිල්ටර']],
  ['fuel-filter', 'fluids', 'Fuel filter', 'ෆියුල් ෆිල්ටරය', ['fuel filter']],
  ['cabin-filter', 'fluids', 'Cabin / AC filter', 'කැබින් ෆිල්ටරය', ['cabin filter', 'ac filter']],
  ['coolant', 'fluids', 'Coolant & brake fluid', 'කූලන්ට් සහ බ්‍රේක් ෆ්ලුවිඩ්', ['coolant', 'radiator water', 'brake fluid', 'power steering oil']],

  ['clutch-kit', 'transmission', 'Clutch plate / kit', 'ක්ලච් ප්ලේට්', ['clutch', 'clutch plate', 'pressure plate', 'ක්ලච්']],
  ['flywheel', 'transmission', 'Flywheel', 'ෆ්ලයිවීල්', ['flywheel']],
  ['cv-joint', 'transmission', 'CV joint / drive shaft', 'සීවී ජොයින්ට්', ['cv joint', 'drive shaft', 'axle', 'cv boot']],
  ['gearbox-parts', 'transmission', 'Gearbox parts', 'ගියර්බොක්ස් කොටස්', ['gearbox', 'gear box', 'ගියර්']],

  ['brake-pads', 'brakes', 'Brake pads', 'බ්‍රේක් පෑඩ්', ['brake pad', 'brake pads', 'pads', 'පෑඩ්', 'බ්‍රේක් පෑඩ්']],
  ['brake-disc', 'brakes', 'Brake discs / drums', 'බ්‍රේක් ඩිස්ක්', ['brake disc', 'disc', 'rotor', 'drum', 'ඩිස්ක්']],
  ['brake-shoes', 'brakes', 'Brake shoes', 'බ්‍රේක් ෂූ', ['brake shoe', 'shoes']],
  ['brake-caliper', 'brakes', 'Calipers & cylinders', 'කැලිපර්', ['caliper', 'brake cylinder', 'master cylinder']],
  ['brake-hose', 'brakes', 'Brake hoses & lines', 'බ්‍රේක් හෝස්', ['brake hose', 'brake line']],

  ['shock-absorber', 'suspension', 'Shock absorbers / struts', 'ෂොක් ඇබ්සෝබර්', ['shock', 'shock absorber', 'strut', 'ෂොක්']],
  ['spring', 'suspension', 'Springs', 'ස්ප්‍රිං', ['spring', 'coil spring']],
  ['control-arm', 'suspension', 'Control arms & links', 'කොන්ට්‍රෝල් ආම්', ['control arm', 'lower arm', 'stabilizer link', 'link rod']],
  ['ball-joint', 'suspension', 'Ball joints & tie rod ends', 'බෝල් ජොයින්ට්', ['ball joint', 'tie rod', 'rack end', 'tie rod end']],
  ['bushings', 'suspension', 'Rubber bushings', 'බුෂ්', ['bush', 'bushing', 'rubber bush']],
  ['wheel-bearing', 'suspension', 'Wheel bearings & hubs', 'වීල් බෙයාරින්', ['wheel bearing', 'hub', 'bearing']],
  ['steering-rack', 'suspension', 'Steering rack & pump', 'ස්ටියරින් රැක්', ['steering rack', 'power steering pump', 'steering']],

  ['headlight', 'lighting', 'Headlights', 'හෙඩ්ලයිට්', ['headlight', 'head light', 'head lamp', 'හෙඩ් ලයිට්', 'හෙඩ්ලයිට්'], ['Halogen', 'LED', 'HID / Xenon']],
  ['tail-light', 'lighting', 'Tail lights', 'ටේල් ලයිට්', ['tail light', 'tail lamp', 'rear light', 'ටේල් ලයිට්']],
  ['fog-lamp', 'lighting', 'Fog lamps', 'ෆොග් ලැම්ප්', ['fog lamp', 'fog light']],
  ['indicator', 'lighting', 'Indicators & side lights', 'ඉන්ඩිකේටර්', ['indicator', 'signal light', 'side light', 'winker']],
  ['bulbs', 'lighting', 'Bulbs', 'බල්බ', ['bulb', 'led bulb', 'බල්බ']],

  ['alternator', 'electrical', 'Alternator', 'ඇල්ටර්නේටරය', ['alternator', 'dynamo', 'ඇල්ටර්නේටර්']],
  ['starter-motor', 'electrical', 'Starter motor', 'ස්ටාටර් මෝටරය', ['starter', 'starter motor', 'self motor', 'ස්ටාටර්']],
  ['spark-plug', 'electrical', 'Spark plugs & ignition coils', 'ස්පාක් ප්ලග්', ['spark plug', 'plugs', 'ignition coil', 'coil pack']],
  ['sensors', 'electrical', 'Sensors', 'සෙන්සර්', ['sensor', 'o2 sensor', 'maf', 'map sensor', 'crank sensor', 'abs sensor']],
  ['wiper', 'electrical', 'Wipers & motors', 'වයිපර්', ['wiper', 'wiper blade', 'wiper motor', 'වයිපර්']],
  ['switches-relays', 'electrical', 'Switches, relays & fuses', 'ස්විච්, රිලේ', ['switch', 'relay', 'fuse', 'horn']],

  ['battery', 'battery', 'Car batteries', 'මෝටර් රථ බැටරි', ['battery', 'car battery', 'බැටරි']],
  ['battery-accessories', 'battery', 'Terminals & chargers', 'ටර්මිනල්, චාජර්', ['terminal', 'battery charger']],

  ['radiator', 'cooling', 'Radiators & fans', 'රේඩියේටරය', ['radiator', 'radiator fan', 'cooling fan', 'thermostat', 'රේඩියේටර්']],
  ['ac-compressor', 'cooling', 'A/C compressor & condenser', 'A/C කොම්ප්‍රෙසරය', ['ac compressor', 'compressor', 'condenser', 'ac']],
  ['ac-parts', 'cooling', 'A/C gas & parts', 'A/C ගෑස්', ['ac gas', 'blower', 'evaporator', 'a/c gas']],

  ['muffler', 'exhaust', 'Mufflers & exhaust', 'මෆ්ලර්', ['muffler', 'silencer', 'exhaust', 'catalytic converter', 'මෆ්ලර්']],
  ['fuel-pump', 'exhaust', 'Fuel pumps & injectors', 'ෆියුල් පොම්පය', ['fuel pump', 'injector', 'ෆියුල් පොම්ප']],

  ['bumper', 'body', 'Bumpers & grilles', 'බම්පර්', ['bumper', 'grille', 'බම්පර්']],
  ['fender', 'body', 'Fenders, bonnets & doors', 'ෆෙන්ඩර්', ['fender', 'bonnet', 'hood', 'door', 'wing', 'boot lid']],
  ['body-trim', 'body', 'Handles, trims & mouldings', 'හැන්ඩ්ල්, ට්‍රිම්', ['door handle', 'moulding', 'trim', 'mud flap']],

  ['windscreen', 'glass', 'Windscreens & door glass', 'වින්ඩ්ස්ක්‍රීන්', ['windscreen', 'windshield', 'door glass', 'rear glass']],
  ['side-mirror', 'glass', 'Side mirrors', 'සයිඩ් මිරර්', ['side mirror', 'wing mirror', 'mirror', 'මිරර්']],

  ['tyre', 'tyres', 'Tyres', 'ටයර්', ['tyre', 'tire', 'ටයර්'], ['Radial', 'Tubeless', 'Run-flat']],
  ['alloy-wheel', 'tyres', 'Alloy wheels & nuts', 'ඇලෝයි රෝද', ['alloy', 'rim', 'wheel nut', 'wheel']],

  ['seat-cover', 'interior', 'Seat covers & mats', 'සීට් කවර', ['seat cover', 'floor mat', 'mats']],
  ['dashboard', 'interior', 'Dashboard & console parts', 'ඩෑෂ්බෝඩ් කොටස්', ['dashboard', 'console', 'steering wheel', 'gear knob']],

  ['audio', 'accessories', 'Car audio & screens', 'ඕඩියෝ', ['audio', 'speaker', 'stereo', 'screen', 'android player']],
  ['cameras-security', 'accessories', 'Cameras & alarms', 'කැමරා, ඇලාම්', ['camera', 'reverse camera', 'alarm', 'sensor parking']],
  ['wheel-covers', 'accessories', 'Covers, kits & accessories', 'ඇක්සෙසරීස්', ['cover', 'body kit', 'spoiler', 'accessories', 'sticker']],

  ['hybrid-battery', 'hybrid', 'Hybrid battery & cells', 'හයිබ්‍රිඩ් බැටරිය', ['hybrid battery', 'hv battery', 'ibs', 'battery cell']],
  ['inverter', 'hybrid', 'Inverter & hybrid electronics', 'ඉන්වර්ටරය', ['inverter', 'hybrid pump', 'dc converter']],
  ['ev-charging', 'hybrid', 'EV charging gear', 'EV චාජින්', ['ev charger', 'charging cable', 'type 2']],

  ['bike-chain', 'motorbike', 'Chain, sprockets & clutch', 'චේන් සහ ස්ප්‍රොකට්', ['chain', 'sprocket', 'bike clutch']],
  ['bike-brakes', 'motorbike', 'Bike brakes & tyres', 'බයික් බ්‍රේක් සහ ටයර්', ['bike brake', 'bike tyre', 'bike pads']],
  ['bike-engine', 'motorbike', 'Bike engine & electrics', 'බයික් එන්ජින් කොටස්', ['bike engine', 'bike battery', 'carburetor', 'cdi', 'bike spark']],

  ['tw-parts', 'threewheeler', 'Three-wheeler engine & gear parts', 'ත්‍රීරෝද එන්ජින් කොටස්', ['three wheeler', 'tuk', 'bajaj', 'tuktuk parts']],
  ['tw-body', 'threewheeler', 'Three-wheeler body & electrics', 'ත්‍රීරෝද බඩි සහ විදුලි', ['tuk body', 'three wheeler hood', 'tw electrical']],
];

export const PART_TAXONOMY: PartTaxonomyPart[] = ROWS.map(([id, groupId, name, si, words, variants]) => ({ id, groupId, name, si, words, variants }));

// ---------- Vehicles ----------

type MakeRow = { make: string; kind: VehicleKind; aliases?: string[]; models: { model: string; codes?: string[] }[] };

/**
 * The makes and models parts shops tag, with the chassis / model codes used in Sri Lanka to tell a part apart (a Premio "NZT240" and a
 * Premio "ZRT260" take different parts). Codes are the optional, deeper tag.
 */
export const VEHICLE_MAKES: MakeRow[] = [
  { make: 'Toyota', kind: 'car', aliases: ['toyota'], models: [
    { model: 'Axio', codes: ['NZE141', 'NZE161', 'NKE165'] }, { model: 'Allion', codes: ['NZT240', 'ZRT260', 'ZRT265'] }, { model: 'Premio', codes: ['NZT240', 'ZRT260', 'ZRT265'] },
    { model: 'Vitz', codes: ['KSP90', 'KSP130', 'NCP131'] }, { model: 'Aqua', codes: ['NHP10'] }, { model: 'Prius', codes: ['ZVW30', 'ZVW50', 'NHW20'] },
    { model: 'Corolla', codes: ['NZE121', 'NZE141', 'ZRE152'] }, { model: 'Land Cruiser', codes: ['J200', 'J100'] }, { model: 'Hilux', codes: ['KDN165', 'GUN125'] }, { model: 'CHR', codes: ['ZYX10'] },
  ] },
  { make: 'Honda', kind: 'car', aliases: ['honda'], models: [
    { model: 'Fit', codes: ['GD1', 'GE6', 'GP5', 'GK3'] }, { model: 'Vezel', codes: ['RU1', 'RU3'] }, { model: 'Civic', codes: ['FD1', 'FB2', 'FC1'] }, { model: 'Grace', codes: ['GM4', 'GM5'] }, { model: 'CR-V', codes: ['RE3', 'RM1'] }, { model: 'Insight', codes: ['ZE2'] },
  ] },
  { make: 'Nissan', kind: 'car', aliases: ['nissan', 'datsun'], models: [
    { model: 'March', codes: ['K11', 'K12', 'K13'] }, { model: 'Leaf', codes: ['ZE0', 'ZE1'] }, { model: 'Sunny', codes: ['B15', 'N17'] }, { model: 'X-Trail', codes: ['T30', 'T31'] }, { model: 'Tiida', codes: ['C11'] },
  ] },
  { make: 'Suzuki', kind: 'car', aliases: ['suzuki', 'maruti'], models: [
    { model: 'Alto', codes: ['HA24', 'HA36'] }, { model: 'Wagon R', codes: ['MH55S', 'MH23S'] }, { model: 'Swift', codes: ['ZC72S', 'ZC83S'] }, { model: 'Every', codes: ['DA17V', 'DA64V'] }, { model: 'Jimny', codes: ['JB23', 'JB64'] },
  ] },
  { make: 'Mitsubishi', kind: 'car', aliases: ['mitsubishi', 'mitsu'], models: [{ model: 'Lancer', codes: ['CS2A', 'CY2A'] }, { model: 'Montero', codes: ['V98W'] }, { model: 'Outlander', codes: ['GF7W'] }, { model: 'Pajero' }] },
  { make: 'Mazda', kind: 'car', aliases: ['mazda'], models: [{ model: 'Demio', codes: ['DE3FS', 'DJ3FS'] }, { model: 'Axela', codes: ['BK5P', 'BM5FP'] }, { model: 'CX-5' }, { model: 'Premacy' }] },
  { make: 'Mercedes-Benz', kind: 'car', aliases: ['benz', 'mercedes', 'merc', 'mercedes benz', 'mercedes-benz'], models: [{ model: 'C-Class', codes: ['W204', 'W205'] }, { model: 'E-Class', codes: ['W211', 'W212'] }, { model: 'A-Class', codes: ['W176'] }, { model: 'GLA' }] },
  { make: 'BMW', kind: 'car', aliases: ['bmw'], models: [{ model: '3 Series', codes: ['E90', 'F30'] }, { model: '5 Series', codes: ['E60', 'F10'] }, { model: 'X1' }, { model: 'X3' }] },
  { make: 'Audi', kind: 'car', aliases: ['audi'], models: [{ model: 'A3' }, { model: 'A4' }, { model: 'Q3' }] },
  { make: 'Volkswagen', kind: 'car', aliases: ['vw', 'volkswagen'], models: [{ model: 'Golf' }, { model: 'Polo' }, { model: 'Passat' }] },
  { make: 'Hyundai', kind: 'car', aliases: ['hyundai'], models: [{ model: 'Santa Fe' }, { model: 'Tucson' }, { model: 'i10' }] },
  { make: 'Kia', kind: 'car', aliases: ['kia'], models: [{ model: 'Sportage' }, { model: 'Picanto' }] },
  { make: 'Micro', kind: 'car', aliases: ['micro'], models: [{ model: 'Panda' }, { model: 'Trend' }, { model: 'Kyron' }] },
  { make: 'Tata', kind: 'commercial', aliases: ['tata'], models: [{ model: 'Nano' }, { model: 'Indica' }, { model: 'Dimo Batta' }, { model: 'Super Ace' }] },
  { make: 'Isuzu', kind: 'commercial', aliases: ['isuzu'], models: [{ model: 'D-Max' }, { model: 'Elf' }] },
  { make: 'Mahindra', kind: 'commercial', aliases: ['mahindra'], models: [{ model: 'Bolero' }, { model: 'Scorpio' }] },
  { make: 'Bajaj', kind: 'threewheeler', aliases: ['bajaj'], models: [{ model: 'RE', codes: ['RE4S'] }, { model: 'Pulsar' }, { model: 'Discover' }] },
  { make: 'TVS', kind: 'bike', aliases: ['tvs'], models: [{ model: 'Apache' }, { model: 'King' }, { model: 'Wego' }] },
  { make: 'Yamaha', kind: 'bike', aliases: ['yamaha'], models: [{ model: 'FZ' }, { model: 'Ray ZR' }, { model: 'R15' }] },
  { make: 'Hero', kind: 'bike', aliases: ['hero'], models: [{ model: 'Splendor' }, { model: 'Hunk' }] },
  { make: 'Honda Motorcycles', kind: 'bike', aliases: ['honda bike', 'honda cd', 'honda dio'], models: [{ model: 'Dio' }, { model: 'CD 125' }, { model: 'Hornet' }] },
];

export const VEHICLE_KIND_LABEL: Record<VehicleKind, string> = { car: 'මෝටර් රථ', commercial: 'වාණිජ / ලොරි', bike: 'යතුරුපැදි', threewheeler: 'ත්‍රීරෝද' };

/** Brand tags a shop can add to a part kind (the maker of the part, not of the vehicle). */
export const PART_BRANDS: string[] = [
  'Toyota Genuine', 'Honda Genuine', 'Nissan Genuine', 'Suzuki Genuine', 'Mitsubishi Genuine', 'Mazda Genuine', 'Bosch', 'Denso', 'NGK', 'KYB', 'Monroe', 'Koito', 'TYC', 'Depo', 'Aisin', 'Exide', 'Amaron',
  'Yokohama', 'Bridgestone', 'Dunlop', 'MRF', 'DSI', 'CEAT', 'Castrol', 'Mobil', 'Valvoline', 'Shell', 'Total', 'Brembo', 'Akebono', 'Philips', 'Osram', 'Gates', 'Mann', 'Mahle', 'Valeo', 'Sachs', 'LuK', 'Local / Aftermarket',
];
