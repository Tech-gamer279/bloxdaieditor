// Demo data layer for local development without Supabase
// All data is stored in localStorage

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

const SNIPPETS_KEY = 'bloxd_demo_snippets';
const PROFILES_KEY = 'bloxd_demo_profiles';
const FORUM_KEY = 'bloxd_demo_forum';

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Initialize with sample data if empty
const initSampleData = () => {
  const existingSnippets = localStorage.getItem(SNIPPETS_KEY);
  if (!existingSnippets) {
    const sampleSnippets: Snippet[] = [
      {
        id: generateId(),
        title: "Block Spawner Script",
        code: `// Spawns blocks at random positions
function spawnBlock() {
  const x = Math.random() * 100;
  const y = 10;
  const z = Math.random() * 100;
  
  game.createBlock({
    position: { x, y, z },
    type: "stone"
  });
}

// Spawn blocks every 2 seconds
setInterval(spawnBlock, 2000);`,
        author_name: "BloxdMaster",
        user_id: "sample-1",
        likes: 42,
        views: 156,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: generateId(),
        title: "Player Jump Boost",
        code: `// Gives players a jump boost power-up
function addJumpBoost(player, multiplier = 2) {
  const originalJump = player.jumpPower;
  player.jumpPower *= multiplier;
  
  // Reset after 10 seconds
  setTimeout(() => {
    player.jumpPower = originalJump;
  }, 10000);
}

// Usage: addJumpBoost(currentPlayer, 3);`,
        author_name: "CodeNinja",
        user_id: "sample-2",
        likes: 28,
        views: 89,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: generateId(),
        title: "Custom Chat Commands",
        code: `// Handle custom chat commands
game.on('chat', (message, player) => {
  if (message.startsWith('/')) {
    const [cmd, ...args] = message.slice(1).split(' ');
    
    switch(cmd) {
      case 'tp':
        player.teleport(parseFloat(args[0]), parseFloat(args[1]), parseFloat(args[2]));
        break;
      case 'give':
        player.inventory.add(args[0], parseInt(args[1]) || 1);
        break;
      default:
        player.sendMessage('Unknown command: ' + cmd);
    }
  }
});`,
        author_name: "GameDev99",
        user_id: "sample-3",
        likes: 67,
        views: 234,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ];
    localStorage.setItem(SNIPPETS_KEY, JSON.stringify(sampleSnippets));
  }

  const existingProfiles = localStorage.getItem(PROFILES_KEY);
  if (!existingProfiles) {
    const sampleProfiles: Profile[] = [
      { user_id: "sample-1", username: "BloxdMaster", bio: "Bloxd enthusiast", avatar_url: null, rank_points: 250 },
      { user_id: "sample-2", username: "CodeNinja", bio: "Love coding games", avatar_url: null, rank_points: 120 },
      { user_id: "sample-3", username: "GameDev99", bio: "Game developer", avatar_url: null, rank_points: 380 },
    ];
    localStorage.setItem(PROFILES_KEY, JSON.stringify(sampleProfiles));
  }
};

// Initialize on module load
initSampleData();

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

// Listeners for real-time simulation
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export const subscribe = (callback: Listener): (() => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const notifyChange = () => {
  listeners.forEach(cb => cb());
};
