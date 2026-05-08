// Demo authentication system for local development
// This allows the app to work without a backend

export interface DemoUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

interface DemoSession {
  user: DemoUser;
  access_token: string;
  expires_at: number;
}

const STORAGE_KEY = 'bloxd_demo_auth';
const USERS_KEY = 'bloxd_demo_users';

// Generate a simple unique ID
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Get stored users
const getStoredUsers = (): Record<string, { password: string; user: DemoUser }> => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save users
const saveUsers = (users: Record<string, { password: string; user: DemoUser }>) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Get current session
export const getSession = (): DemoSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const session: DemoSession = JSON.parse(stored);
    
    // Check if expired
    if (session.expires_at < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
};

// Sign up with email/password
export const signUp = async (email: string, password: string, username?: string): Promise<{ user: DemoUser | null; error: Error | null }> => {
  const users = getStoredUsers();
  
  // Check if user already exists
  if (users[email.toLowerCase()]) {
    return { user: null, error: new Error('An account with this email already exists') };
  }
  
  // Create new user
  const newUser: DemoUser = {
    id: generateId(),
    email: email.toLowerCase(),
    username: username || email.split('@')[0],
    created_at: new Date().toISOString(),
  };
  
  // Store user
  users[email.toLowerCase()] = { password, user: newUser };
  saveUsers(users);
  
  // Create session
  const session: DemoSession = {
    user: newUser,
    access_token: generateId(),
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  
  return { user: newUser, error: null };
};

// Sign in with email/password
export const signIn = async (email: string, password: string): Promise<{ user: DemoUser | null; error: Error | null }> => {
  const users = getStoredUsers();
  const storedUser = users[email.toLowerCase()];
  
  if (!storedUser) {
    return { user: null, error: new Error('No account found with this email') };
  }
  
  if (storedUser.password !== password) {
    return { user: null, error: new Error('Invalid password') };
  }
  
  // Create session
  const session: DemoSession = {
    user: storedUser.user,
    access_token: generateId(),
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  
  return { user: storedUser.user, error: null };
};

// Sign in with Google (demo - creates a fake Google user)
export const signInWithGoogle = async (): Promise<{ user: DemoUser | null; error: Error | null }> => {
  // Simulate Google OAuth by creating a demo user
  const randomNum = Math.floor(Math.random() * 10000);
  const demoGoogleUser: DemoUser = {
    id: generateId(),
    email: `demo.user.${randomNum}@gmail.com`,
    username: `GoogleUser${randomNum}`,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomNum}`,
    created_at: new Date().toISOString(),
  };
  
  // Create session
  const session: DemoSession = {
    user: demoGoogleUser,
    access_token: generateId(),
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  
  // Store user for persistence
  const users = getStoredUsers();
  users[demoGoogleUser.email] = { password: '', user: demoGoogleUser };
  saveUsers(users);
  
  return { user: demoGoogleUser, error: null };
};

// Sign out
export const signOut = async (): Promise<void> => {
  localStorage.removeItem(STORAGE_KEY);
};

// Subscribe to auth changes
type AuthCallback = (user: DemoUser | null) => void;
const listeners: Set<AuthCallback> = new Set();

export const onAuthChange = (callback: AuthCallback): (() => void) => {
  listeners.add(callback);
  
  // Call immediately with current state
  const session = getSession();
  callback(session?.user ?? null);
  
  return () => {
    listeners.delete(callback);
  };
};

// Notify all listeners
export const notifyAuthChange = () => {
  const session = getSession();
  const user = session?.user ?? null;
  listeners.forEach(callback => callback(user));
};

// Update user profile
export const updateProfile = async (updates: Partial<Pick<DemoUser, 'username' | 'avatar_url'>>): Promise<{ error: Error | null }> => {
  const session = getSession();
  if (!session) {
    return { error: new Error('Not authenticated') };
  }
  
  const users = getStoredUsers();
  const storedUser = users[session.user.email];
  
  if (storedUser) {
    storedUser.user = { ...storedUser.user, ...updates };
    saveUsers(users);
    
    // Update session
    session.user = storedUser.user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    
    notifyAuthChange();
  }
  
  return { error: null };
};
