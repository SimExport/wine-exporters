import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCrmAccess } from '@/hooks/useCrmAccess';
import PremiumFeaturePreview, { PremiumFeature } from './PremiumFeaturePreview';

/** For ExportVins trial accounts, replaces a premium page before it mounts (no data is fetched). */
export const PremiumGate = ({ feature, children }: { feature: PremiumFeature; children: ReactNode }) => {
  const { isTrialAccount, loading, discountEligible } = useCrmAccess();
  if (loading) return null;
  if (isTrialAccount) return <PremiumFeaturePreview feature={feature} discountEligible={discountEligible} />;
  return <>{children}</>;
};

/** Sends ExportVins trial accounts to the CRM instead of the dashboard. */
export const TrialHomeRedirect = ({ children }: { children: ReactNode }) => {
  const { isTrialAccount, loading } = useCrmAccess();
  if (loading) return null;
  if (isTrialAccount) return <Navigate to="/pipeline" replace />;
  return <>{children}</>;
};
