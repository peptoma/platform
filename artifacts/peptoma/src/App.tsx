import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/layout";
import { WalletProvider } from "@/contexts/wallet-context";

const Home          = lazy(() => import("@/pages/home"));
const Lab           = lazy(() => import("@/pages/lab"));
const Feed          = lazy(() => import("@/pages/feed"));
const Annotate      = lazy(() => import("@/pages/annotate"));
const Missions      = lazy(() => import("@/pages/missions"));
const Token         = lazy(() => import("@/pages/token"));
const Agents        = lazy(() => import("@/pages/agents"));
const Docs          = lazy(() => import("@/pages/docs"));
const Ecosystem     = lazy(() => import("@/pages/ecosystem"));
const Peptides      = lazy(() => import("@/pages/peptides"));
const PeptideDetail = lazy(() => import("@/pages/peptide-detail"));
const CopilotPage   = lazy(() => import("@/pages/copilot"));
const Science       = lazy(() => import("@/pages/science"));
const SdkPage       = lazy(() => import("@/pages/sdk"));
const Events        = lazy(() => import("@/pages/events"));
const Governance    = lazy(() => import("@/pages/governance"));
const Profile       = lazy(() => import("@/pages/profile"));
const Marketplace   = lazy(() => import("@/pages/marketplace"));
const NotFound      = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[hsl(var(--peptoma-cyan))] border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase">Loading</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/">{() => <Home />}</Route>
        <Route path="/lab">{() => <Lab />}</Route>
        <Route path="/feed">{() => <Feed />}</Route>
        <Route path="/annotate/:id">{() => <Annotate />}</Route>
        <Route path="/missions">{() => <Missions />}</Route>
        <Route path="/token">{() => <Token />}</Route>
        <Route path="/agents">{() => <Agents />}</Route>
        <Route path="/docs">{() => <Docs />}</Route>
        <Route path="/ecosystem">{() => <Ecosystem />}</Route>
        <Route path="/peptides">{() => <Peptides />}</Route>
        <Route path="/peptides/:id">{() => <PeptideDetail />}</Route>
        <Route path="/copilot">{() => <CopilotPage />}</Route>
        <Route path="/science">{() => <Science />}</Route>
        <Route path="/sdk">{() => <SdkPage />}</Route>
        <Route path="/events">{() => <Events />}</Route>
        <Route path="/governance">{() => <Governance />}</Route>
        <Route path="/profile/:wallet">{() => <Profile />}</Route>
        <Route path="/marketplace">{() => <Marketplace />}</Route>
        <Route>{() => <NotFound />}</Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppLayout>
              <Router />
            </AppLayout>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}
