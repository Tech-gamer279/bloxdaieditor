import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth as useClerkAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Admin from "./pages/Admin";
import Community from "./pages/Community";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const appearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#0ea5e9",
    colorBackground: "#0d1117",
    colorInputBackground: "#161b22",
    colorInputText: "#e6edf3",
    colorText: "#e6edf3",
    colorTextSecondary: "#8b949e",
    colorNeutral: "#30363d",
    colorDanger: "#f85149",
    fontFamily: "'Inter', 'JetBrains Mono', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "!bg-[#0d1117] border border-[#30363d] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-[#8b949e]",
    socialButtonsBlockButton: "!bg-[#161b22] !border-[#30363d] hover:!bg-[#21262d] !text-white",
    socialButtonsBlockButtonText: "!text-white",
    formFieldLabel: "!text-[#e6edf3]",
    formFieldInput: "!bg-[#161b22] !border-[#30363d] !text-white placeholder:!text-[#8b949e]",
    formButtonPrimary: "!bg-[#0ea5e9] hover:!bg-[#0284c7] !text-white",
    footerActionLink: "!text-[#0ea5e9] hover:!text-[#38bdf8]",
    footerActionText: "!text-[#8b949e]",
    dividerText: "!text-[#8b949e]",
    dividerLine: "!bg-[#30363d]",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10 w-10",
    identityPreviewEditButton: "!text-[#0ea5e9]",
    alertText: "!text-[#e6edf3]",
    formFieldSuccessText: "!text-[#3fb950]",
    alert: "!bg-[#1f2937] !border-[#30363d]",
    otpCodeFieldInput: "!bg-[#161b22] !border-[#30363d] !text-white",
    footerAction: "!bg-transparent",
    main: "gap-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={appearance}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        appearance={appearance}
      />
    </div>
  );
}

function ClerkTokenSync() {
  const { getToken } = useClerkAuth();
  useEffect(() => {
    setAuthTokenGetter(getToken);
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AppRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to Bloxd.code",
            subtitle: "Sign in to share and discover Bloxd scripts",
          },
        },
        signUp: {
          start: {
            title: "Join Bloxd.code",
            subtitle: "Create your account to get started",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkTokenSync />
        <ClerkQueryClientCacheInvalidator />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AuthProvider>
                <Switch>
                  <Route path="/" component={Index} />
                  <Route path="/sign-in/*?" component={SignInPage} />
                  <Route path="/sign-up/*?" component={SignUpPage} />
                  <Route path="/profile" component={Profile} />
                  <Route path="/u/:username" component={PublicProfile} />
                  <Route path="/community" component={Community} />
                  <Route path="/admin" component={Admin} />
                  <Route component={NotFound} />
                </Switch>
              </AuthProvider>
            </TooltipProvider>
          </SettingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}

export default App;
