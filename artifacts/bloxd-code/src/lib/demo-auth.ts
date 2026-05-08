// Legacy demo auth stubs — no longer used. Auth is handled by Clerk.
// Kept to avoid breaking any residual imports.

export interface DemoUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export const getSession = () => null;
export const signIn = async () => ({ user: null, error: new Error("Use Clerk auth") });
export const signUp = async () => ({ user: null, error: new Error("Use Clerk auth") });
export const signInWithGoogle = async () => ({ user: null, error: new Error("Use Clerk auth") });
export const signOut = async () => {};
export const onAuthChange = (_cb: (u: DemoUser | null) => void) => () => {};
export const notifyAuthChange = () => {};
export const updateProfile = async () => ({ error: null });
