import { z } from 'zod';

// Coverage type enum
const coverageTypeEnum = z.enum(['local', 'multi_state', 'national', 'state']);

// Status enum
const statusEnum = z.enum(['active', 'paused', 'test', 'inactive']);

// Investor base schema
export const investorSchema = z.object({
  company_name: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be less than 200 characters'),
  
  main_poc: z.string()
    .trim()
    .min(1, 'Main POC is required')
    .max(200, 'Main POC must be less than 200 characters'),
  
  hubspot_url: z.string()
    .trim()
    .url('Must be a valid URL')
    .max(500, 'URL must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  coverage_type: coverageTypeEnum,
  
  tier: z.number()
    .int('Tier must be a whole number')
    .min(1, 'Tier must be at least 1')
    .max(10, 'Tier must be at most 10'),
  
  weekly_cap: z.number()
    .int('Weekly cap must be a whole number')
    .min(0, 'Weekly cap cannot be negative')
    .max(10000, 'Weekly cap must be less than 10,000'),
  
  cold_accepts: z.boolean(),
  
  offer_types: z.array(z.string().max(100)).max(20, 'Too many offer types'),
  
  tags: z.array(z.string().max(100)).max(20, 'Too many tags'),
  
  status: statusEnum,
  
  status_reason: z.string()
    .max(500, 'Status reason must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Buy box schema
export const buyBoxSchema = z.object({
  property_types: z.array(z.string().max(100)).max(20, 'Too many property types'),
  
  on_market_status: z.array(z.string().max(100)).max(10, 'Too many status options'),
  
  year_built_min: z.number()
    .int('Year must be a whole number')
    .min(1800, 'Year must be after 1800')
    .max(new Date().getFullYear() + 5, 'Year cannot be too far in the future')
    .optional(),
  
  year_built_max: z.number()
    .int('Year must be a whole number')
    .min(1800, 'Year must be after 1800')
    .max(new Date().getFullYear() + 5, 'Year cannot be too far in the future')
    .optional(),
  
  price_min: z.number()
    .min(0, 'Price cannot be negative')
    .max(100000000, 'Price must be less than $100M')
    .optional(),
  
  price_max: z.number()
    .min(0, 'Price cannot be negative')
    .max(100000000, 'Price must be less than $100M')
    .optional(),
  
  condition_types: z.array(z.string().max(100)).max(20, 'Too many condition types'),
  
  timeframe: z.array(z.string().max(100)).max(20, 'Too many timeframe options'),
  
  lead_types: z.array(z.string().max(100)).max(20, 'Too many lead types'),
  
  buy_box_notes: z.string()
    .max(5000, 'Notes must be less than 5000 characters')
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    if (data.year_built_min && data.year_built_max) {
      return data.year_built_min <= data.year_built_max;
    }
    return true;
  },
  {
    message: 'Minimum year must be less than or equal to maximum year',
    path: ['year_built_min'],
  }
).refine(
  (data) => {
    if (data.price_min && data.price_max) {
      return data.price_min <= data.price_max;
    }
    return true;
  },
  {
    message: 'Minimum price must be less than or equal to maximum price',
    path: ['price_min'],
  }
);

// Markets schema
export const marketsSchema = z.object({
  full_coverage_states: z.string()
    .max(500, 'States list is too long')
    .optional()
    .or(z.literal('')),
  
  direct_purchase_markets: z.string()
    .max(5000, 'Markets list is too long')
    .optional()
    .or(z.literal('')),
  
  primary_zip_codes: z.string()
    .max(50000, 'Zip codes list is too long')
    .optional()
    .or(z.literal('')),
  
  secondary_zip_codes: z.string()
    .max(50000, 'Zip codes list is too long')
    .optional()
    .or(z.literal('')),
});

// Combined form schema (merge base schemas before adding refinements)
const baseInvestorSchema = investorSchema;
const baseBuyBoxSchema = z.object({
  property_types: z.array(z.string().max(100)).max(20, 'Too many property types'),
  on_market_status: z.array(z.string().max(100)).max(10, 'Too many status options'),
  year_built_min: z.number().int('Year must be a whole number').min(1800, 'Year must be after 1800').max(new Date().getFullYear() + 5, 'Year cannot be too far in the future').optional(),
  year_built_max: z.number().int('Year must be a whole number').min(1800, 'Year must be after 1800').max(new Date().getFullYear() + 5, 'Year cannot be too far in the future').optional(),
  price_min: z.number().min(0, 'Price cannot be negative').max(100000000, 'Price must be less than $100M').optional(),
  price_max: z.number().min(0, 'Price cannot be negative').max(100000000, 'Price must be less than $100M').optional(),
  condition_types: z.array(z.string().max(100)).max(20, 'Too many condition types'),
  timeframe: z.array(z.string().max(100)).max(20, 'Too many timeframe options'),
  lead_types: z.array(z.string().max(100)).max(20, 'Too many lead types'),
  buy_box_notes: z.string().max(5000, 'Notes must be less than 5000 characters').optional().or(z.literal('')),
});

export const investorFormSchema = baseInvestorSchema.merge(baseBuyBoxSchema).merge(marketsSchema);

// Type inference
export type InvestorFormData = z.infer<typeof investorFormSchema>;
