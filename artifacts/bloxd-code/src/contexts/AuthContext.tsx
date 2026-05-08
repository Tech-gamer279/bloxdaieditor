import { createContext, useContext, type ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";

export interface AppUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const appUser: AppUser | null = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        username:
          user.username ??
          user.firstName ??
          user.primaryEmailAddress?.emailAddress?.split("@")[0] ??
          "User",
        avatar_url: user.imageUrl ?? undefined,
      }
    : null;

  const signOut = async () => {
    await clerkSignOut();
  };

  return (
    <AuthContext.Provider value={{ user: appUser, loading: !isLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
