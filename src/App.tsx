import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DomainProfile from "./pages/DomainProfile";
import Profile from "./pages/Profile";
import Campaigns from "./pages/Campaigns";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignDetail from "./pages/CampaignDetail";
import Importers from "./pages/Importers";
import Settings from "./pages/Settings";
import Prospects from "./pages/Prospects";
import ProspectDetail from "./pages/ProspectDetail";
import AdminCampaigns from "./pages/AdminCampaigns";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle authenticated routes
const AuthenticatedApp = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AuthenticatedApp />} />
            <Route path="/lp" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
            <Route path="/campaigns" element={<DashboardLayout><Campaigns /></DashboardLayout>} />
            <Route path="/create-campaign" element={<DashboardLayout><CreateCampaign /></DashboardLayout>} />
            <Route path="/importers" element={<DashboardLayout><Importers /></DashboardLayout>} />
            <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
            <Route path="/prospects" element={<DashboardLayout><Prospects /></DashboardLayout>} />
            <Route path="/prospects/:id" element={<DashboardLayout><ProspectDetail /></DashboardLayout>} />
            <Route path="/admin/campaigns" element={
              <DashboardLayout>
                <AdminRoute>
                  <AdminCampaigns />
                </AdminRoute>
              </DashboardLayout>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;