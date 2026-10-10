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

/** Disables all form controls for ExportVins trial accounts in their 7-day read-only week. */
export const TrialReadonly = ({ children }: { children: ReactNode }) => {
  const { isReadonly, isClosed, isTrialAccount } = useCrmAccess();
  if (isTrialAccount && isClosed) return <Navigate to="/pipeline" replace />;
  return <fieldset disabled={isReadonly} className={isReadonly ? 'opacity-80' : ''}>{children}</fieldset>;
};
