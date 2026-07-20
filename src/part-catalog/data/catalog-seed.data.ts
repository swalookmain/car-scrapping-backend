import { PartType } from 'src/common/enum/partType.enum';
import { CatalogPartCategory } from 'src/common/enum/catalogPartCategory.enum';
import { VehicleType } from 'src/common/enum/vehicleType.enum';

export interface SeedCatalogPart {
  code: string;
  name: string;
  partType: PartType;
  category: CatalogPartCategory;
  defaultQty?: number;
  sortOrder: number;
  defaultMaterialCode?: string;
  matterClass?: string;
  defaultStateOfMatter?: string;
  defaultWeightUnit?: string;
}

export const SALEABLE_COMMERCIAL_PARTS: SeedCatalogPart[] = [
  { code: 'ENG_GEAR', name: 'Engine / Gearbox', partType: PartType.ENGINE, category: CatalogPartCategory.SALEABLE, sortOrder: 10 },
  { code: 'FR_DIFF', name: 'Front Differential', partType: PartType.TRANSMISSION, category: CatalogPartCategory.SALEABLE, sortOrder: 20 },
  { code: 'CABIN', name: 'Cabin', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 30 },
  { code: 'RIM', name: 'Rim', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, defaultQty: 4, sortOrder: 40 },
  { code: 'TYRE', name: 'Tyre', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, defaultQty: 4, sortOrder: 50, defaultMaterialCode: 'TYRES', matterClass: 'NON_METAL', defaultStateOfMatter: 'SOLID', defaultWeightUnit: 'KG' },
  { code: 'KAMANI', name: 'Kamani (Leaf Spring)', partType: PartType.SUSPENSION, category: CatalogPartCategory.SALEABLE, sortOrder: 60 },
  { code: 'CHASSIS', name: 'Chassis', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 70 },
  { code: 'RADIATOR', name: 'Radiator', partType: PartType.ENGINE, category: CatalogPartCategory.SALEABLE, sortOrder: 80 },
  { code: 'STEERING_BOX', name: 'Steering Box', partType: PartType.SUSPENSION, category: CatalogPartCategory.SALEABLE, sortOrder: 90 },
  { code: 'SHAFT', name: 'Prop Shaft', partType: PartType.TRANSMISSION, category: CatalogPartCategory.SALEABLE, sortOrder: 100 },
  { code: 'BATTERY', name: 'Battery', partType: PartType.ELECTRICAL, category: CatalogPartCategory.SALEABLE, sortOrder: 110, defaultMaterialCode: 'BATTERIES', matterClass: 'OTHER', defaultStateOfMatter: 'SOLID', defaultWeightUnit: 'KG' },
  { code: 'WIRING', name: 'Wiring Harness', partType: PartType.ELECTRICAL, category: CatalogPartCategory.SALEABLE, sortOrder: 120 },
  { code: 'FUEL_TANK', name: 'Fuel Tank', partType: PartType.EXHAUST, category: CatalogPartCategory.SALEABLE, sortOrder: 130 },
  { code: 'SPECIAL_GEAR', name: 'Special Gear', partType: PartType.TRANSMISSION, category: CatalogPartCategory.SALEABLE, sortOrder: 140 },
  { code: 'LOOSE_PARTS', name: 'Loose Parts', partType: PartType.OTHER, category: CatalogPartCategory.SALEABLE, sortOrder: 150 },
];

export const SCRAP_PARTS: SeedCatalogPart[] = [
  {
    code: 'SCRAP_KAMANI_KG',
    name: 'Kamani Scrap (KG)',
    partType: PartType.OTHER,
    category: CatalogPartCategory.SCRAP,
    sortOrder: 200,
    defaultMaterialCode: 'FERROUS',
    matterClass: 'METAL',
    defaultStateOfMatter: 'SOLID',
    defaultWeightUnit: 'KG',
  },
  {
    code: 'SCRAP_PLASTIC_KG',
    name: 'Plastic Scrap (KG)',
    partType: PartType.PLASTIC,
    category: CatalogPartCategory.SCRAP,
    sortOrder: 210,
    defaultMaterialCode: 'PLASTICS',
    matterClass: 'NON_METAL',
    defaultStateOfMatter: 'SOLID',
    defaultWeightUnit: 'KG',
  },
  {
    code: 'SCRAP_AL_KG',
    name: 'Aluminium Scrap (KG)',
    partType: PartType.OTHER,
    category: CatalogPartCategory.SCRAP,
    sortOrder: 220,
    defaultMaterialCode: 'ALUMINIUM',
    matterClass: 'METAL',
    defaultStateOfMatter: 'SOLID',
    defaultWeightUnit: 'KG',
  },
  {
    code: 'SCRAP_CU_KG',
    name: 'Copper Scrap (KG)',
    partType: PartType.ELECTRICAL,
    category: CatalogPartCategory.SCRAP,
    sortOrder: 230,
    defaultMaterialCode: 'COPPER',
    matterClass: 'METAL',
    defaultStateOfMatter: 'SOLID',
    defaultWeightUnit: 'KG',
  },
  {
    code: 'SCRAP_IRON_KG',
    name: 'Iron Scrap (KG)',
    partType: PartType.OTHER,
    category: CatalogPartCategory.SCRAP,
    sortOrder: 240,
    defaultMaterialCode: 'FERROUS',
    matterClass: 'METAL',
    defaultStateOfMatter: 'SOLID',
    defaultWeightUnit: 'KG',
  },
  {
    code: 'SCRAP_LOOSE',
    name: 'Loose Scrap',
    partType: PartType.OTHER,
    category: CatalogPartCategory.SCRAP,
    sortOrder: 250,
    defaultMaterialCode: 'FERROUS',
    matterClass: 'OTHER',
    defaultStateOfMatter: 'SOLID',
    defaultWeightUnit: 'KG',
  },
];

export const CAR_GENERIC_PARTS: SeedCatalogPart[] = [
  { code: 'CAR_ENGINE', name: 'Engine', partType: PartType.ENGINE, category: CatalogPartCategory.SALEABLE, sortOrder: 10 },
  { code: 'CAR_GEARBOX', name: 'Gearbox', partType: PartType.TRANSMISSION, category: CatalogPartCategory.SALEABLE, sortOrder: 20 },
  { code: 'CAR_BONNET', name: 'Bonnet', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 30 },
  { code: 'CAR_BOOT', name: 'Boot / Dicky', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 40 },
  { code: 'CAR_DOOR_FL', name: 'Door Front Left', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 50 },
  { code: 'CAR_DOOR_FR', name: 'Door Front Right', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 60 },
  { code: 'CAR_DOOR_RL', name: 'Door Rear Left', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 70 },
  { code: 'CAR_DOOR_RR', name: 'Door Rear Right', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 80 },
  { code: 'CAR_BUMPER_F', name: 'Bumper Front', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 90 },
  { code: 'CAR_BUMPER_R', name: 'Bumper Rear', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 100 },
  { code: 'CAR_RADIATOR', name: 'Radiator', partType: PartType.ENGINE, category: CatalogPartCategory.SALEABLE, sortOrder: 110 },
  { code: 'CAR_ALTERNATOR', name: 'Alternator', partType: PartType.ELECTRICAL, category: CatalogPartCategory.SALEABLE, sortOrder: 120 },
  { code: 'CAR_ECU', name: 'ECU', partType: PartType.ELECTRICAL, category: CatalogPartCategory.SALEABLE, sortOrder: 130 },
  { code: 'CAR_BATTERY', name: 'Battery', partType: PartType.ELECTRICAL, category: CatalogPartCategory.SALEABLE, sortOrder: 140 },
  { code: 'CAR_AC_COMP', name: 'AC Compressor', partType: PartType.ELECTRICAL, category: CatalogPartCategory.SALEABLE, sortOrder: 150 },
  { code: 'CAR_SEATS', name: 'Seats Set', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 160 },
  { code: 'CAR_DASHBOARD', name: 'Dashboard', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 170 },
  { code: 'CAR_STEERING', name: 'Steering', partType: PartType.SUSPENSION, category: CatalogPartCategory.SALEABLE, sortOrder: 180 },
  { code: 'CAR_WHEEL', name: 'Wheel / Rim', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, defaultQty: 4, sortOrder: 190 },
  { code: 'CAR_TYRE', name: 'Tyre', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, defaultQty: 4, sortOrder: 200 },
];

export const BIKE_GENERIC_PARTS: SeedCatalogPart[] = [
  { code: 'BIKE_ENGINE', name: 'Engine', partType: PartType.ENGINE, category: CatalogPartCategory.SALEABLE, sortOrder: 10 },
  { code: 'BIKE_GEARBOX', name: 'Gearbox', partType: PartType.TRANSMISSION, category: CatalogPartCategory.SALEABLE, sortOrder: 20 },
  { code: 'BIKE_BATTERY', name: 'Battery', partType: PartType.ELECTRICAL, category: CatalogPartCategory.SALEABLE, sortOrder: 30 },
  { code: 'BIKE_WHEEL', name: 'Wheel', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, defaultQty: 2, sortOrder: 40 },
  { code: 'BIKE_TYRE', name: 'Tyre', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, defaultQty: 2, sortOrder: 50 },
  { code: 'BIKE_BODY', name: 'Body Panels', partType: PartType.BODY, category: CatalogPartCategory.SALEABLE, sortOrder: 60 },
  { code: 'BIKE_ELECTRICAL', name: 'Electrical Loom', partType: PartType.ELECTRICAL, category: CatalogPartCategory.SALEABLE, sortOrder: 70 },
];

export interface SeedVehicleModel {
  make: string;
  model: string;
  vehicleType: VehicleType;
  variant?: string;
}

export const SEED_VEHICLE_MODELS: SeedVehicleModel[] = [
  { make: 'TATA', model: 'SUMO JAMMER', vehicleType: VehicleType.COMMERCIAL },
  { make: 'TATA', model: 'TRUCK 1613', vehicleType: VehicleType.COMMERCIAL },
  { make: 'TATA', model: '407', vehicleType: VehicleType.COMMERCIAL },
  { make: 'TATA', model: 'BUS', vehicleType: VehicleType.COMMERCIAL },
  { make: 'SML', model: 'AMBULANCE', vehicleType: VehicleType.COMMERCIAL },
  { make: 'SML', model: 'MINI BUS', vehicleType: VehicleType.COMMERCIAL },
  { make: 'MAHINDRA', model: 'THAR', vehicleType: VehicleType.CAR },
  { make: 'MAHINDRA', model: 'TRUCK', vehicleType: VehicleType.COMMERCIAL },
  { make: 'MAHINDRA', model: 'BOLERO', vehicleType: VehicleType.COMMERCIAL },
  { make: 'MAHINDRA', model: 'DIESEL JEEP', vehicleType: VehicleType.CAR },
  { make: 'MARUTI', model: 'GYPSY', vehicleType: VehicleType.CAR },
  { make: 'TOYOTA', model: 'LAND CRUISER PRADO', vehicleType: VehicleType.CAR },
  { make: 'EICHER', model: 'TRUCK', vehicleType: VehicleType.COMMERCIAL },
];

export const VEHICLE_TYPE_TEMPLATE_CODES: Record<VehicleType, string[]> = {
  [VehicleType.COMMERCIAL]: [
    ...SALEABLE_COMMERCIAL_PARTS.map((p) => p.code),
    ...SCRAP_PARTS.map((p) => p.code),
  ],
  [VehicleType.CAR]: CAR_GENERIC_PARTS.map((p) => p.code),
  [VehicleType.BIKE]: BIKE_GENERIC_PARTS.map((p) => p.code),
};

export const ALL_SEED_PARTS: SeedCatalogPart[] = [
  ...SALEABLE_COMMERCIAL_PARTS,
  ...SCRAP_PARTS,
  ...CAR_GENERIC_PARTS,
  ...BIKE_GENERIC_PARTS,
];
