import { MaterialFormSection } from 'src/common/enum/materialFormSection.enum';
import { MatterClass } from 'src/common/enum/matterClass.enum';
import { StateOfMatter } from 'src/common/enum/stateOfMatter.enum';

export interface SeedMaterial {
  code: string;
  label: string;
  formSection: MaterialFormSection;
  matterClass: MatterClass;
  defaultStateOfMatter?: StateOfMatter;
  sortOrder: number;
}

/** FORM-3 locked system materials (Outwards + Hazardous streams) */
export const SYSTEM_MATERIALS: SeedMaterial[] = [
  {
    code: 'FERROUS',
    label: 'Ferrous',
    formSection: MaterialFormSection.OUTWARDS,
    matterClass: MatterClass.METAL,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 10,
  },
  {
    code: 'ALUMINIUM',
    label: 'Aluminium',
    formSection: MaterialFormSection.OUTWARDS,
    matterClass: MatterClass.METAL,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 20,
  },
  {
    code: 'COPPER',
    label: 'Copper',
    formSection: MaterialFormSection.OUTWARDS,
    matterClass: MatterClass.METAL,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 30,
  },
  {
    code: 'PLASTICS',
    label: 'Plastics',
    formSection: MaterialFormSection.OUTWARDS,
    matterClass: MatterClass.NON_METAL,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 40,
  },
  {
    code: 'GLASS',
    label: 'Glass',
    formSection: MaterialFormSection.OUTWARDS,
    matterClass: MatterClass.NON_METAL,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 50,
  },
  {
    code: 'TYRES',
    label: 'Tyres',
    formSection: MaterialFormSection.OUTWARDS,
    matterClass: MatterClass.NON_METAL,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 60,
  },
  {
    code: 'PRECIOUS_METALS',
    label: 'Precious Metals',
    formSection: MaterialFormSection.OUTWARDS,
    matterClass: MatterClass.METAL,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 70,
  },
  {
    code: 'FUEL',
    label: 'Fuel',
    formSection: MaterialFormSection.HAZ_REPROCESS,
    matterClass: MatterClass.OTHER,
    defaultStateOfMatter: StateOfMatter.LIQUID,
    sortOrder: 110,
  },
  {
    code: 'OILS',
    label: 'Oils',
    formSection: MaterialFormSection.HAZ_REPROCESS,
    matterClass: MatterClass.OTHER,
    defaultStateOfMatter: StateOfMatter.LIQUID,
    sortOrder: 120,
  },
  {
    code: 'GASES',
    label: 'Gases',
    formSection: MaterialFormSection.HAZ_REPROCESS,
    matterClass: MatterClass.OTHER,
    defaultStateOfMatter: StateOfMatter.GAS,
    sortOrder: 130,
  },
  {
    code: 'BATTERIES',
    label: 'Batteries',
    formSection: MaterialFormSection.HAZ_REPROCESS,
    matterClass: MatterClass.OTHER,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 140,
  },
  {
    code: 'FLUIDS',
    label: 'Fluids',
    formSection: MaterialFormSection.HAZ_REPROCESS,
    matterClass: MatterClass.OTHER,
    defaultStateOfMatter: StateOfMatter.LIQUID,
    sortOrder: 150,
  },
  {
    code: 'RESIDUES_RETAINED',
    label: 'Residues Retained',
    formSection: MaterialFormSection.HAZ_LANDFILL,
    matterClass: MatterClass.OTHER,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 210,
  },
  {
    code: 'LANDFILL',
    label: 'Landfill',
    formSection: MaterialFormSection.HAZ_LANDFILL,
    matterClass: MatterClass.OTHER,
    defaultStateOfMatter: StateOfMatter.SOLID,
    sortOrder: 220,
  },
];
