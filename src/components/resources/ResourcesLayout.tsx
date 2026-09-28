import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import PublicLayout from "./PublicLayout";

/** Connecté : mise en page du tableau de bord (inchangée). Visiteur : mise en page publique. */
const ResourcesLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  return user ? <DashboardLayout>{children}</DashboardLayout> : <PublicLayout>{children}</PublicLayout>;
};

export default ResourcesLayout;
