import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useOnboarding } from '@/hooks/useOnboarding';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, loading } = useAuth();
  const onboarding = useOnboarding();
  const location = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);

  // Auto-open on very first visit
  useEffect(() => {
    if (!onboarding.loading && onboarding.shouldShow) setWizardOpen(true);
  }, [onboarding.loading, onboarding.shouldShow]);

  // Allow other components to trigger the wizard via custom event
  useEffect(() => {
    const handler = () => setWizardOpen(true);
    window.addEventListener('open-onboarding', handler);
    return () => window.removeEventListener('open-onboarding', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <OnboardingWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); onboarding.refresh(); }}
          onComplete={() => { setWizardOpen(false); onboarding.refresh(); }}
        />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;