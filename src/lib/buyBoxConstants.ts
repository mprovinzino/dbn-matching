// Standardized dropdown values for buy box criteria
// These values must match exactly between forms and search to ensure accurate matching

export const PROPERTY_TYPES = [
  'Single Family Residence',
  'Condominiums',
  'Townhomes',
  'Multi-Family (2-4 units)',
  'Multi-Family (5+ units)',
  'Land',
  'Mobile Home',
] as const;

export const CONDITION_TYPES = [
  'Move in Ready with newer finishes',
  'Move in Ready with Older Finishes',
  'Needs Few Repairs',
  'Needs Major Repairs',
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number];
export type ConditionType = typeof CONDITION_TYPES[number];
