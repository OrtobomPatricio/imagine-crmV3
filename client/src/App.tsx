import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
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
import { useEffect } from "react";

// Redirect component for consolidated routes
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);
  return null;
}

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
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/leads" component={LeadsModule} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/monitoring" component={Monitoring} />
        {/* Marketing Module - consolidated with tabs */}
        <Route path="/campaigns" component={MarketingModule} />
        <Route path="/campaigns/new" component={CampaignBuilder} />
        <Route path="/templates" component={MarketingModule} />
        <Route path="/automations" component={MarketingModule} />
        <Route path="/automations/new" component={AutomationBuilder} />
        <Route path="/automations/:id" component={AutomationBuilder} />
        {/* Legacy redirects */}
        <Route path="/reports">{() => <Redirect to="/analytics" />}</Route>
        <Route path="/kanban">{() => <Redirect to="/leads" />}</Route>
        <Route path="/warmup">{() => <Redirect to="/monitoring" />}</Route>
        
        <Route path="/integrations" component={Integrations} />
        <Route path="/settings" component={Settings} />
        <Route path="/settings/pipelines" component={PipelineSettings} />
        <Route path="/scheduling" component={Scheduling} />
        <Route path="/chat" component={Chat} />
        {/* Helpdesk Module - consolidated with tabs */}
        <Route path="/helpdesk" component={Helpdesk} />
        <Route path="/helpdesk/queues">{() => <Redirect to="/helpdesk" />}</Route>
        <Route path="/helpdesk/quick-answers">{() => <Redirect to="/helpdesk" />}</Route>
        
        <Route path="/backup" component={Backup} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
