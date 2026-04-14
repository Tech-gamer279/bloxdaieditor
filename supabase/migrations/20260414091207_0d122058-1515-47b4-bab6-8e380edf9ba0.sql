CREATE OR REPLACE FUNCTION public.get_rank_title(points INTEGER)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN points >= 500 THEN 'Legend'
    WHEN points >= 200 THEN 'Master'
    WHEN points >= 100 THEN 'Expert'
    WHEN points >= 50 THEN 'Pro'
    WHEN points >= 20 THEN 'Coder'
    WHEN points >= 5 THEN 'Beginner'
    ELSE 'Newbie'
  END;
$$;