// Demo data layer — all data stored in localStorage.
// Sample/seed data has been removed. Only real user-created content is shown.

export interface Snippet {
  id: string;
  title: string;
  code: string;
  author_name: string;
  user_id: string;
  likes: number;
  views: number;
  created_at: string;
}

export interface Profile {
  user_id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  rank_points: number;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_name: string;
  user_id: string;
  likes: number;
  reply_count: number;
  created_at: string;
}

const SNIPPETS_KEY = 'bloxd_snippets';
const PROFILES_KEY = 'bloxd_profiles';
const FORUM_KEY = 'bloxd_forum';

// Clear any legacy sample data from old keys
const LEGACY_KEYS = ['bloxd_demo_snippets', 'bloxd_demo_profiles', 'bloxd_demo_forum', 'bloxd_demo_auth', 'bloxd_demo_users', 'bloxd_demo_admins', 'bloxd_demo_community_messages'];
LEGACY_KEYS.forEach(k => localStorage.removeItem(k));

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Snippets API
export const snippetsApi = {
  getAll: (): Snippet[] => {
    try {
      const stored = localStorage.getItem(SNIPPETS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  create: (snippet: Omit<Snippet, 'id' | 'likes' | 'views' | 'created_at'>): Snippet => {
    const snippets = snippetsApi.getAll();
    const newSnippet: Snippet = {
      ...snippet,
      id: generateId(),
      likes: 0,
      views: 0,
      created_at: new Date().toISOString(),
    };
    snippets.unshift(newSnippet);
    localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
    return newSnippet;
  },

  like: (id: string): void => {
    const snippets = snippetsApi.getAll();
    const idx = snippets.findIndex(s => s.id === id);
    if (idx !== -1) {
      snippets[idx].likes += 1;
      localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
    }
  },

  view: (id: string): void => {
    const snippets = snippetsApi.getAll();
    const idx = snippets.findIndex(s => s.id === id);
    if (idx !== -1) {
      snippets[idx].views += 1;
      localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
    }
  },

  delete: (id: string): void => {
    const snippets = snippetsApi.getAll().filter(s => s.id !== id);
    localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
  },
};

// Profiles API
export const profilesApi = {
  getAll: (): Profile[] => {
    try {
      const stored = localStorage.getItem(PROFILES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  get: (userId: string): Profile | null => {
    const profiles = profilesApi.getAll();
    return profiles.find(p => p.user_id === userId) || null;
  },

  getByUsername: (username: string): Profile | null => {
    const profiles = profilesApi.getAll();
    return profiles.find(p => p.username?.toLowerCase() === username.toLowerCase()) || null;
  },

  upsert: (profile: Profile): void => {
    const profiles = profilesApi.getAll();
    const idx = profiles.findIndex(p => p.user_id === profile.user_id);
    if (idx !== -1) {
      profiles[idx] = { ...profiles[idx], ...profile };
    } else {
      profiles.push(profile);
    }
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  },

  addPoints: (userId: string, points: number): void => {
    const profiles = profilesApi.getAll();
    const idx = profiles.findIndex(p => p.user_id === userId);
    if (idx !== -1) {
      profiles[idx].rank_points += points;
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }
  },

  getTopUsers: (limit: number = 10): Profile[] => {
    const profiles = profilesApi.getAll();
    return profiles.sort((a, b) => b.rank_points - a.rank_points).slice(0, limit);
  },
};

// Forum API
export const forumApi = {
  getAll: (): ForumPost[] => {
    try {
      const stored = localStorage.getItem(FORUM_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  create: (post: Omit<ForumPost, 'id' | 'likes' | 'reply_count' | 'created_at'>): ForumPost => {
    const posts = forumApi.getAll();
    const newPost: ForumPost = {
      ...post,
      id: generateId(),
      likes: 0,
      reply_count: 0,
      created_at: new Date().toISOString(),
    };
    posts.unshift(newPost);
    localStorage.setItem(FORUM_KEY, JSON.stringify(posts));
    return newPost;
  },

  like: (id: string): void => {
    const posts = forumApi.getAll();
    const idx = posts.findIndex(p => p.id === id);
    if (idx !== -1) {
      posts[idx].likes += 1;
      localStorage.setItem(FORUM_KEY, JSON.stringify(posts));
    }
  },
};

// Listeners
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export const subscribe = (callback: Listener): (() => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const notifyChange = () => {
  listeners.forEach(cb => cb());
};
