import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ConnectionIndicator } from "./components/ConnectionIndicator";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import MarketingModule from "@/pages/MarketingModule";
import LeadsModule from "@/pages/LeadsModule";
import Analytics from "./pages/Analytics";
import Monitoring from "./pages/Monitoring";
import CampaignBuilder from "./pages/CampaignBuilder";
import AutomationBuilder from "./pages/AutomationBuilder";
import Integrations from "./pages/Integrations";
import PipelineSettings from "./pages/PipelineSettings";
import Settings from "./pages/Settings";
import Scheduling from "./pages/Scheduling";
import Chat from "./pages/Chat";
import Helpdesk from "./pages/Helpdesk";
import Backup from "./pages/Backup";
import Login from "./pages/Login";
import SetupAccount from "./pages/SetupAccount";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import OnboardingPage from "./pages/OnboardingPage";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { OnboardingChecklist } from "./components/onboarding/OnboardingChecklist";
// Redirect component for consolidated routes
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);
  return null;
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [location] = useLocation(); // Use array destructuring for wouter's useLocation
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const { data: onboarding, isLoading: isLoadingOnboarding } = trpc.onboarding.getProgress.useQuery();

  if (isLoading || isLoadingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // Forced Onboarding Redirect (skip in dev mode since MockDB can't persist progress)
  const isDev = import.meta.env.DEV;
  const isOnboardingDone = onboarding?.completedAt || isDev;
  if (!isOnboardingDone && location !== '/onboarding') {
    return <Redirect to="/onboarding" />;
  }

  // Prevent accessing onboarding if already done
  if (isOnboardingDone && location === '/onboarding') {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
};

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/setup-account" component={SetupAccount} />
        <Route path="/terms">{() => <TermsPage />}</Route>
        <Route path="/privacy">{() => <PrivacyPage />}</Route>
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <ProtectedRoute>
      <Switch>
        <Route path="/onboarding" component={OnboardingPage} />
        <Route>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/leads" component={LeadsModule} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/monitoring" component={Monitoring} />
              <Route path="/campaigns" component={MarketingModule} />
              <Route path="/campaigns/new" component={CampaignBuilder} />
              <Route path="/templates" component={MarketingModule} />
              <Route path="/automations" component={MarketingModule} />
              <Route path="/automations/new" component={AutomationBuilder} />
              <Route path="/automations/:id" component={AutomationBuilder} />
              <Route path="/reports">{() => <Redirect to="/analytics" />}</Route>
              <Route path="/kanban">{() => <Redirect to="/leads" />}</Route>
              <Route path="/warmup">{() => <Redirect to="/monitoring" />}</Route>
              <Route path="/integrations" component={Integrations} />
              <Route path="/settings" component={Settings} />
              <Route path="/settings/pipelines" component={PipelineSettings} />
              <Route path="/scheduling" component={Scheduling} />
              <Route path="/chat" component={Chat} />
              <Route path="/helpdesk" component={Helpdesk} />
              <Route path="/helpdesk/queues">{() => <Redirect to="/helpdesk" />}</Route>
              <Route path="/helpdesk/quick-answers">{() => <Redirect to="/helpdesk" />}</Route>
              <Route path="/terms">{() => <TermsPage />}</Route>
              <Route path="/privacy">{() => <PrivacyPage />}</Route>
              <Route path="/backup" component={Backup} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </Route>
      </Switch>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <ConnectionIndicator />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
