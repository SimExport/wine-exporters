import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import AdminRoute from "@/components/AdminRoute";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import DemoRequest from "./pages/DemoRequest";
import Dashboard from "./pages/Dashboard";
import DomainProfile from "./pages/DomainProfile";
import Profile from "./pages/Profile";
import Campaigns from "./pages/Campaigns";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignDetail from "./pages/CampaignDetail";
import Importers from "./pages/Importers";
import Settings from "./pages/Settings";
import ProspectDetail from "./pages/ProspectDetail";
import CRM from "./pages/CRM";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminInvitations from "./pages/AdminInvitations";
import AdminSourcing from "./pages/AdminSourcing";
import AdminUsers from "./pages/AdminUsers";
import AdminUserProfile from "./pages/AdminUserProfile";
import SourcingRequests from "./pages/SourcingRequests";
import SetPassword from "./pages/SetPassword";
import ResetPassword from "./pages/ResetPassword";
import Billing from "./pages/Billing";
import Roadmap from "./pages/Roadmap";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle authenticated routes - redirects to dashboard if logged in
const AuthenticatedApp = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/demande-demo" element={<DemoRequest />} />
            <Route path="/demo" element={<Navigate to="/demande-demo" replace />} />
            <Route
              path="/register"
              element={<Navigate to="/demande-demo" replace state={{ fromRegister: true }} />}
            />
            <Route
              path="/signup"
              element={<Navigate to="/demande-demo" replace state={{ fromRegister: true }} />}
            />
            <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
            <Route path="/campaigns" element={<DashboardLayout><Campaigns /></DashboardLayout>} />
            <Route path="/create-campaign" element={<DashboardLayout><CreateCampaign /></DashboardLayout>} />
            <Route path="/importers" element={<DashboardLayout><Importers /></DashboardLayout>} />
            <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
            <Route path="/prospects" element={<Navigate to="/pipeline" replace />} />
            <Route path="/prospects/:id" element={<DashboardLayout><ProspectDetail /></DashboardLayout>} />
            <Route path="/pipeline" element={<DashboardLayout><CRM /></DashboardLayout>} />
            <Route path="/crm" element={<Navigate to="/pipeline" replace />} />
            <Route path="/billing" element={<DashboardLayout><Billing /></DashboardLayout>} />
            <Route path="/roadmap" element={<DashboardLayout><Roadmap /></DashboardLayout>} />
            <Route path="/help" element={<DashboardLayout><Help /></DashboardLayout>} />
            <Route path="/recherches" element={<DashboardLayout><SourcingRequests /></DashboardLayout>} />
            <Route path="/admin/campaigns" element={
              <DashboardLayout>
                <AdminRoute>
                  <AdminCampaigns />
                </AdminRoute>
              </DashboardLayout>
            } />
            <Route path="/admin/recherches" element={
              <DashboardLayout>
                <AdminRoute>
                  <AdminSourcing />
                </AdminRoute>
              </DashboardLayout>
            } />
            <Route path="/admin/invitations" element={
              <DashboardLayout>
                <AdminRoute>
                  <AdminInvitations />
                </AdminRoute>
              </DashboardLayout>
            } />
            <Route path="/admin/users" element={
              <DashboardLayout>
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              </DashboardLayout>
            } />
            <Route path="/admin/users/:userId" element={
              <DashboardLayout>
                <AdminRoute>
                  <AdminUserProfile />
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