import React, { Suspense, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect, Link } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { PreferencesProvider } from "@/context/preferences-context";
import {
  LocalAuthProvider,
  useLocalAuth,
} from "@/lib/local-auth";

const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Analytics = React.lazy(() => import("@/pages/Analytics"));
const Calories = React.lazy(() => import("@/pages/Calories"));
const Challenges = React.lazy(() => import("@/pages/Challenges"));
const Steps = React.lazy(() => import("@/pages/Steps"));
const Exercises = React.lazy(() => import("@/pages/Exercises"));
const History = React.lazy(() => import("@/pages/History"));
const Goals = React.lazy(() => import("@/pages/Goals"));
const HeartRate = React.lazy(() => import("@/pages/HeartRate"));
const Inventory = React.lazy(() => import("@/pages/Inventory"));
const Landing = React.lazy(() => import("@/pages/Landing"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const Reports = React.lazy(() => import("@/pages/Reports"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const Sleep = React.lazy(() => import("@/pages/Sleep"));
const Support = React.lazy(() => import("@/pages/Support"));

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const authMode =
  import.meta.env.VITE_AUTH_MODE === "clerk"
    ? "clerk"
    : import.meta.env.VITE_AUTH_MODE === "disabled"
      ? "disabled"
      : "local";

const clerkPubKey =
  authMode === "clerk"
    ? publishableKeyFromHost(
        window.location.hostname,
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
      )
    : null;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (authMode === "clerk" && !clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(174,65%,38%)",
    colorForeground: "hsl(210,25%,12%)",
    colorMutedForeground: "hsl(210,15%,45%)",
    colorDanger: "hsl(0,84%,60%)",
    colorBackground: "hsl(0,0%,100%)",
    colorInput: "hsl(185,20%,92%)",
    colorInputForeground: "hsl(210,25%,12%)",
    colorNeutral: "hsl(185,20%,75%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-display font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-semibold",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-foreground",
    logoBox: "flex justify-center mb-1",
    logoImage: "w-12 h-12 rounded-xl",
    socialButtonsBlockButton: "border border-border bg-white hover:bg-secondary/50",
    formButtonPrimary: "bg-primary text-white font-semibold",
    formFieldInput: "bg-input border-border text-foreground",
    footerAction: "border-t border-border",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border border-destructive/20",
    otpCodeFieldInput: "border-border bg-input text-foreground",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, hsl(174,60%,22%) 0%, hsl(174,65%,38%) 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={`${basePath}/logo.svg`} alt="VitalTrack" className="w-10 h-10 rounded-xl" />
            <span className="font-display font-bold text-2xl text-white">VitalTrack</span>
          </div>
          <p className="text-white/70 text-sm">Your personal health companion</p>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, hsl(174,60%,22%) 0%, hsl(174,65%,38%) 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={`${basePath}/logo.svg`} alt="VitalTrack" className="w-10 h-10 rounded-xl" />
            <span className="font-display font-bold text-2xl text-white">VitalTrack</span>
          </div>
          <p className="text-white/70 text-sm">Start tracking your health today</p>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, hsl(174,60%,22%) 0%, hsl(174,65%,38%) 100%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img
              src={`${basePath}/logo.svg`}
              alt="VitalTrack"
              className="w-10 h-10 rounded-xl"
            />
            <span className="font-display font-bold text-2xl text-white">
              VitalTrack
            </span>
          </div>
          <p className="text-white/70 text-sm">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 text-slate-950 shadow-xl">
          <h1 className="mb-5 text-xl font-display font-bold text-slate-950">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function LocalSignInPage() {
  const { signIn } = useLocalAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
      queryClient.clear();
      setLocation("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Welcome back to VitalTrack">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signin-password">Password</Label>
          <Input
            id="signin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link href="/sign-up" className="font-semibold text-primary">
            Create account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

function LocalSignUpPage() {
  const { signUp, status } = useLocalAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await signUp({ name, email, password });
      queryClient.clear();
      setSuccessMessage("Account created successfully.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create account" subtitle="Start tracking your health today">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name</Label>
          <Input
            id="signup-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {successMessage && (
          <p className="text-sm font-medium text-primary">{successMessage}</p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
        {status === "authenticated" && (
          <Link
            href="/dashboard"
            className="block text-center text-sm font-semibold text-primary"
          >
            Go to dashboard
          </Link>
        )}
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/sign-in" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <ClerkLayout>
          <Component />
        </ClerkLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : "My Account";
  const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const userInitial =
    user?.firstName?.charAt(0) ||
    userEmail.charAt(0).toUpperCase() ||
    "U";

  return (
    <Layout
      userName={userName}
      userEmail={userEmail}
      userInitial={userInitial}
      onSignOut={() => signOut({ redirectUrl: basePath || "/" })}
    >
      {children}
    </Layout>
  );
}

function LocalProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { status, user, signOut } = useLocalAuth();
  const [, setLocation] = useLocation();

  if (status === "loading") {
    return null;
  }

  if (status === "anonymous") {
    return <Redirect to="/sign-in" />;
  }

  const userInitial =
    user?.name.charAt(0).toUpperCase() ||
    user?.email.charAt(0).toUpperCase() ||
    "U";

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    setLocation("/");
  }

  return (
    <Layout
      userName={user?.name}
      userEmail={user?.email}
      userInitial={userInitial}
      onSignOut={() => void handleSignOut()}
      showAccountDetails={false}
    >
      <Component />
    </Layout>
  );
}

function DemoProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  return (
    <Layout userName="Local User" userEmail="demo-user">
      <Component />
    </Layout>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function AppRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your VitalTrack account" } },
        signUp: { start: { title: "Create account", subtitle: "Start your health journey with VitalTrack" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Suspense fallback={<RouteFallback />}>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/challenges" component={() => <ProtectedRoute component={Challenges} />} />
              <Route path="/goals" component={() => <ProtectedRoute component={Goals} />} />
              <Route path="/sleep" component={() => <ProtectedRoute component={Sleep} />} />
              <Route path="/heart-rate" component={() => <ProtectedRoute component={HeartRate} />} />
              <Route path="/support" component={() => <ProtectedRoute component={Support} />} />
              <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
              <Route path="/inventory" component={() => <ProtectedRoute component={Inventory} />} />
              <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
              <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
              <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
              <Route path="/calories" component={() => <ProtectedRoute component={Calories} />} />
              <Route path="/steps" component={() => <ProtectedRoute component={Steps} />} />
              <Route path="/exercises" component={() => <ProtectedRoute component={Exercises} />} />
              <Route path="/history" component={() => <ProtectedRoute component={History} />} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function LocalAppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/sign-in/*?" component={LocalSignInPage} />
            <Route path="/sign-up/*?" component={LocalSignUpPage} />
            <Route path="/dashboard" component={() => <LocalProtectedRoute component={Dashboard} />} />
            <Route path="/challenges" component={() => <LocalProtectedRoute component={Challenges} />} />
            <Route path="/goals" component={() => <LocalProtectedRoute component={Goals} />} />
            <Route path="/sleep" component={() => <LocalProtectedRoute component={Sleep} />} />
            <Route path="/heart-rate" component={() => <LocalProtectedRoute component={HeartRate} />} />
            <Route path="/support" component={() => <LocalProtectedRoute component={Support} />} />
            <Route path="/analytics" component={() => <LocalProtectedRoute component={Analytics} />} />
            <Route path="/inventory" component={() => <LocalProtectedRoute component={Inventory} />} />
            <Route path="/reports" component={() => <LocalProtectedRoute component={Reports} />} />
            <Route path="/profile" component={() => <LocalProtectedRoute component={Profile} />} />
            <Route path="/settings" component={() => <LocalProtectedRoute component={Settings} />} />
            <Route path="/calories" component={() => <LocalProtectedRoute component={Calories} />} />
            <Route path="/steps" component={() => <LocalProtectedRoute component={Steps} />} />
            <Route path="/exercises" component={() => <LocalProtectedRoute component={Exercises} />} />
            <Route path="/history" component={() => <LocalProtectedRoute component={History} />} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function DemoAppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/" component={() => <Redirect to="/dashboard" />} />
            <Route path="/sign-in/*?" component={() => <Redirect to="/dashboard" />} />
            <Route path="/sign-up/*?" component={() => <Redirect to="/dashboard" />} />
            <Route path="/dashboard" component={() => <DemoProtectedRoute component={Dashboard} />} />
            <Route path="/challenges" component={() => <DemoProtectedRoute component={Challenges} />} />
            <Route path="/goals" component={() => <DemoProtectedRoute component={Goals} />} />
            <Route path="/sleep" component={() => <DemoProtectedRoute component={Sleep} />} />
            <Route path="/heart-rate" component={() => <DemoProtectedRoute component={HeartRate} />} />
            <Route path="/support" component={() => <DemoProtectedRoute component={Support} />} />
            <Route path="/analytics" component={() => <DemoProtectedRoute component={Analytics} />} />
            <Route path="/inventory" component={() => <DemoProtectedRoute component={Inventory} />} />
            <Route path="/reports" component={() => <DemoProtectedRoute component={Reports} />} />
            <Route path="/profile" component={() => <DemoProtectedRoute component={Profile} />} />
            <Route path="/settings" component={() => <DemoProtectedRoute component={Settings} />} />
            <Route path="/calories" component={() => <DemoProtectedRoute component={Calories} />} />
            <Route path="/steps" component={() => <DemoProtectedRoute component={Steps} />} />
            <Route path="/exercises" component={() => <DemoProtectedRoute component={Exercises} />} />
            <Route path="/history" component={() => <DemoProtectedRoute component={History} />} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <PreferencesProvider>
      <WouterRouter base={basePath}>
        {authMode === "clerk" ? (
          <AppRoutes />
        ) : authMode === "local" ? (
          <LocalAuthProvider>
            <LocalAppRoutes />
          </LocalAuthProvider>
        ) : (
          <DemoAppRoutes />
        )}
      </WouterRouter>
    </PreferencesProvider>
  );
}

export default App;
