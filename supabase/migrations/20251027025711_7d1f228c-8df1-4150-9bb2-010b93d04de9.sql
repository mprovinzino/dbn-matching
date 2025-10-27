-- Populate zip_code_reference table with DMA data
-- This migration imports zip codes, DMAs, and inferred states

-- Helper function to infer state from zip code prefix
CREATE OR REPLACE FUNCTION infer_state_from_zip(zip_code TEXT) 
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
BEGIN
  prefix := SUBSTRING(zip_code, 1, 3);
  
  CASE
    WHEN prefix BETWEEN '010' AND '027' THEN RETURN 'MA';
    WHEN prefix BETWEEN '028' AND '029' THEN RETURN 'RI';
    WHEN prefix BETWEEN '030' AND '038' THEN RETURN 'NH';
    WHEN prefix BETWEEN '039' AND '049' THEN RETURN 'ME';
    WHEN prefix BETWEEN '050' AND '059' THEN RETURN 'VT';
    WHEN prefix BETWEEN '060' AND '069' THEN RETURN 'CT';
    WHEN prefix BETWEEN '070' AND '089' THEN RETURN 'NJ';
    WHEN prefix BETWEEN '100' AND '149' THEN RETURN 'NY';
    WHEN prefix BETWEEN '150' AND '196' THEN RETURN 'PA';
    WHEN prefix BETWEEN '197' AND '199' THEN RETURN 'DE';
    WHEN prefix BETWEEN '200' AND '205' THEN RETURN 'DC';
    WHEN prefix BETWEEN '206' AND '219' THEN RETURN 'MD';
    WHEN prefix BETWEEN '220' AND '246' THEN RETURN 'VA';
    WHEN prefix BETWEEN '247' AND '268' THEN RETURN 'WV';
    WHEN prefix BETWEEN '270' AND '274' THEN RETURN 'MD';
    WHEN prefix BETWEEN '275' AND '289' THEN RETURN 'NC';
    WHEN prefix BETWEEN '290' AND '299' THEN RETURN 'SC';
    WHEN prefix BETWEEN '300' AND '319' THEN RETURN 'GA';
    WHEN prefix BETWEEN '320' AND '349' THEN RETURN 'FL';
    WHEN prefix BETWEEN '350' AND '367' THEN RETURN 'AL';
    WHEN prefix BETWEEN '370' AND '385' THEN RETURN 'TN';
    WHEN prefix BETWEEN '386' AND '397' THEN RETURN 'MS';
    WHEN prefix BETWEEN '400' AND '427' THEN RETURN 'KY';
    WHEN prefix BETWEEN '430' AND '458' THEN RETURN 'OH';
    WHEN prefix BETWEEN '460' AND '479' THEN RETURN 'IN';
    WHEN prefix BETWEEN '480' AND '499' THEN RETURN 'MI';
    WHEN prefix BETWEEN '500' AND '528' THEN RETURN 'IA';
    WHEN prefix BETWEEN '530' AND '549' THEN RETURN 'WI';
    WHEN prefix BETWEEN '550' AND '567' THEN RETURN 'MN';
    WHEN prefix BETWEEN '570' AND '577' THEN RETURN 'SD';
    WHEN prefix BETWEEN '580' AND '588' THEN RETURN 'ND';
    WHEN prefix BETWEEN '590' AND '599' THEN RETURN 'MT';
    WHEN prefix BETWEEN '600' AND '629' THEN RETURN 'IL';
    WHEN prefix BETWEEN '630' AND '658' THEN RETURN 'MO';
    WHEN prefix BETWEEN '660' AND '679' THEN RETURN 'KS';
    WHEN prefix BETWEEN '680' AND '693' THEN RETURN 'NE';
    WHEN prefix BETWEEN '700' AND '714' THEN RETURN 'LA';
    WHEN prefix BETWEEN '716' AND '729' THEN RETURN 'AR';
    WHEN prefix BETWEEN '730' AND '749' THEN RETURN 'OK';
    WHEN prefix BETWEEN '750' AND '799' THEN RETURN 'TX';
    WHEN prefix BETWEEN '800' AND '816' THEN RETURN 'CO';
    WHEN prefix BETWEEN '820' AND '831' THEN RETURN 'WY';
    WHEN prefix BETWEEN '832' AND '838' THEN RETURN 'ID';
    WHEN prefix BETWEEN '840' AND '847' THEN RETURN 'UT';
    WHEN prefix BETWEEN '850' AND '865' THEN RETURN 'AZ';
    WHEN prefix BETWEEN '870' AND '898' THEN RETURN 'NM';
    WHEN prefix BETWEEN '889' AND '891' THEN RETURN 'NV';
    WHEN prefix BETWEEN '900' AND '961' THEN RETURN 'CA';
    WHEN prefix BETWEEN '967' AND '968' THEN RETURN 'HI';
    WHEN prefix BETWEEN '970' AND '979' THEN RETURN 'OR';
    WHEN prefix BETWEEN '980' AND '994' THEN RETURN 'WA';
    WHEN prefix BETWEEN '995' AND '999' THEN RETURN 'AK';
    ELSE RETURN 'Unknown';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert DMA reference data in batches
-- This data was extracted from the DMA mapping spreadsheet

INSERT INTO zip_code_reference (zip_code, city, state, dma) VALUES
('01001', 'Unknown', infer_state_from_zip('01001'), 'SPRINGFIELD - HOLYOKE'),
('01002', 'Unknown', infer_state_from_zip('01002'), 'SPRINGFIELD - HOLYOKE'),
('01003', 'Unknown', infer_state_from_zip('01003'), 'SPRINGFIELD - HOLYOKE'),
('01004', 'Unknown', infer_state_from_zip('01004'), 'SPRINGFIELD - HOLYOKE'),
('01007', 'Unknown', infer_state_from_zip('01007'), 'SPRINGFIELD - HOLYOKE'),
('01008', 'Unknown', infer_state_from_zip('01008'), 'SPRINGFIELD - HOLYOKE'),
('01009', 'Unknown', infer_state_from_zip('01009'), 'SPRINGFIELD - HOLYOKE'),
('01010', 'Unknown', infer_state_from_zip('01010'), 'SPRINGFIELD - HOLYOKE'),
('01011', 'Unknown', infer_state_from_zip('01011'), 'SPRINGFIELD - HOLYOKE'),
('01012', 'Unknown', infer_state_from_zip('01012'), 'SPRINGFIELD - HOLYOKE'),
('01013', 'Unknown', infer_state_from_zip('01013'), 'SPRINGFIELD - HOLYOKE'),
('01014', 'Unknown', infer_state_from_zip('01014'), 'SPRINGFIELD - HOLYOKE'),
('01020', 'Unknown', infer_state_from_zip('01020'), 'SPRINGFIELD - HOLYOKE'),
('01021', 'Unknown', infer_state_from_zip('01021'), 'SPRINGFIELD - HOLYOKE'),
('01022', 'Unknown', infer_state_from_zip('01022'), 'SPRINGFIELD - HOLYOKE'),
('01026', 'Unknown', infer_state_from_zip('01026'), 'SPRINGFIELD - HOLYOKE'),
('01027', 'Unknown', infer_state_from_zip('01027'), 'SPRINGFIELD - HOLYOKE'),
('01028', 'Unknown', infer_state_from_zip('01028'), 'SPRINGFIELD - HOLYOKE'),
('01029', 'Unknown', infer_state_from_zip('01029'), 'ALBANY - SCHENECTADY - TROY'),
('01030', 'Unknown', infer_state_from_zip('01030'), 'SPRINGFIELD - HOLYOKE'),
('01031', 'Unknown', infer_state_from_zip('01031'), 'BOSTON (MANCHESTER)'),
('01032', 'Unknown', infer_state_from_zip('01032'), 'SPRINGFIELD - HOLYOKE'),
('01033', 'Unknown', infer_state_from_zip('01033'), 'SPRINGFIELD - HOLYOKE'),
('01034', 'Unknown', infer_state_from_zip('01034'), 'SPRINGFIELD - HOLYOKE'),
('01035', 'Unknown', infer_state_from_zip('01035'), 'SPRINGFIELD - HOLYOKE'),
('01036', 'Unknown', infer_state_from_zip('01036'), 'SPRINGFIELD - HOLYOKE'),
('01037', 'Unknown', infer_state_from_zip('01037'), 'BOSTON (MANCHESTER)'),
('01038', 'Unknown', infer_state_from_zip('01038'), 'SPRINGFIELD - HOLYOKE'),
('01039', 'Unknown', infer_state_from_zip('01039'), 'SPRINGFIELD - HOLYOKE'),
('01040', 'Unknown', infer_state_from_zip('01040'), 'SPRINGFIELD - HOLYOKE'),
('01041', 'Unknown', infer_state_from_zip('01041'), 'SPRINGFIELD - HOLYOKE'),
('01050', 'Unknown', infer_state_from_zip('01050'), 'SPRINGFIELD - HOLYOKE'),
('01053', 'Unknown', infer_state_from_zip('01053'), 'SPRINGFIELD - HOLYOKE'),
('01054', 'Unknown', infer_state_from_zip('01054'), 'SPRINGFIELD - HOLYOKE'),
('01056', 'Unknown', infer_state_from_zip('01056'), 'SPRINGFIELD - HOLYOKE'),
('01057', 'Unknown', infer_state_from_zip('01057'), 'SPRINGFIELD - HOLYOKE'),
('01059', 'Unknown', infer_state_from_zip('01059'), 'SPRINGFIELD - HOLYOKE'),
('01060', 'Unknown', infer_state_from_zip('01060'), 'SPRINGFIELD - HOLYOKE'),
('01061', 'Unknown', infer_state_from_zip('01061'), 'SPRINGFIELD - HOLYOKE'),
('01062', 'Unknown', infer_state_from_zip('01062'), 'SPRINGFIELD - HOLYOKE'),
('01063', 'Unknown', infer_state_from_zip('01063'), 'SPRINGFIELD - HOLYOKE'),
('01066', 'Unknown', infer_state_from_zip('01066'), 'SPRINGFIELD - HOLYOKE'),
('01068', 'Unknown', infer_state_from_zip('01068'), 'BOSTON (MANCHESTER)'),
('01069', 'Unknown', infer_state_from_zip('01069'), 'SPRINGFIELD - HOLYOKE'),
('01070', 'Unknown', infer_state_from_zip('01070'), 'SPRINGFIELD - HOLYOKE'),
('01071', 'Unknown', infer_state_from_zip('01071'), 'SPRINGFIELD - HOLYOKE'),
('01072', 'Unknown', infer_state_from_zip('01072'), 'SPRINGFIELD - HOLYOKE'),
('01073', 'Unknown', infer_state_from_zip('01073'), 'SPRINGFIELD - HOLYOKE'),
('01074', 'Unknown', infer_state_from_zip('01074'), 'BOSTON (MANCHESTER)'),
('01075', 'Unknown', infer_state_from_zip('01075'), 'SPRINGFIELD - HOLYOKE'),
('01077', 'Unknown', infer_state_from_zip('01077'), 'SPRINGFIELD - HOLYOKE'),
('01079', 'Unknown', infer_state_from_zip('01079'), 'SPRINGFIELD - HOLYOKE')
ON CONFLICT (zip_code) DO UPDATE 
SET dma = EXCLUDED.dma, 
    state = EXCLUDED.state;

-- Note: This is a partial insert. Due to migration size limits, 
-- the full dataset (40,000+ zip codes) should be split into multiple migrations
-- or loaded via the import edge function.

-- Drop the helper function after use
DROP FUNCTION IF EXISTS infer_state_from_zip(TEXT);