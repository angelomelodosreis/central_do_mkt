DELETE FROM persona_pain WHERE persona_id IN (SELECT id FROM persona WHERE slug LIKE '%heloiza%' OR name LIKE '%Heloiza%');
DELETE FROM persona WHERE slug LIKE '%heloiza%' OR name LIKE '%Heloiza%';
