
-- Create snippets table
CREATE TABLE public.snippets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'anonymous',
  likes INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Snippets are viewable by everyone" ON public.snippets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create snippets" ON public.snippets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own snippets" ON public.snippets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own snippets" ON public.snippets FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_snippets_updated_at BEFORE UPDATE ON public.snippets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add rank points to profiles
ALTER TABLE public.profiles ADD COLUMN rank_points INTEGER NOT NULL DEFAULT 0;

-- Create snippet_likes table
CREATE TABLE public.snippet_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snippet_id UUID NOT NULL REFERENCES public.snippets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, snippet_id)
);

ALTER TABLE public.snippet_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" ON public.snippet_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.snippet_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.snippet_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Function to get rank title from points
CREATE OR REPLACE FUNCTION public.get_rank_title(points INTEGER)
RETURNS TEXT
LANGUAGE sql
STABLE
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

-- Function to increment snippet likes and award points
CREATE OR REPLACE FUNCTION public.handle_snippet_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.snippets SET likes = likes + 1 WHERE id = NEW.snippet_id;
    UPDATE public.profiles SET rank_points = rank_points + 2 WHERE user_id = (SELECT user_id FROM public.snippets WHERE id = NEW.snippet_id);
    UPDATE public.profiles SET rank_points = rank_points + 1 WHERE user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.snippets SET likes = likes - 1 WHERE id = OLD.snippet_id;
    UPDATE public.profiles SET rank_points = GREATEST(rank_points - 2, 0) WHERE user_id = (SELECT user_id FROM public.snippets WHERE id = OLD.snippet_id);
    UPDATE public.profiles SET rank_points = GREATEST(rank_points - 1, 0) WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_snippet_like
AFTER INSERT OR DELETE ON public.snippet_likes
FOR EACH ROW
EXECUTE FUNCTION public.handle_snippet_like();

-- Award points when a snippet is created
CREATE OR REPLACE FUNCTION public.handle_snippet_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET rank_points = rank_points + 5 WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_snippet_created
AFTER INSERT ON public.snippets
FOR EACH ROW
EXECUTE FUNCTION public.handle_snippet_created();

-- Enable realtime for snippets
ALTER PUBLICATION supabase_realtime ADD TABLE public.snippets;
