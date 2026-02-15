import { User, Database, Target, Users, Settings, CreditCard, Grape, LogOut, Shield, List, Kanban, Zap, Rocket } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
const navigationItems = [{
  title: "Dashboard",
  url: "/dashboard",
  icon: Target
}, {
  title: "Profil",
  url: "/profile",
  icon: User
}, {
  title: "Importateurs",
  url: "/importers",
  icon: Database
}, {
  title: "Campagnes",
  url: "/campaigns",
  icon: Target
}, {
  title: "CRM - Liste",
  url: "/prospects",
  icon: List
}, {
  title: "CRM - Kanban",
  url: "/pipeline",
  icon: Kanban
}, {
  title: "À venir",
  url: "/roadmap",
  icon: Rocket
}];
const settingsItems = [{
  title: "Paramètres",
  url: "/settings",
  icon: Settings
}, {
  title: "Facturation",
  url: "/billing",
  icon: CreditCard
}];
export function AppSidebar() {
  const {
    user,
    signOut
  } = useAuth();
  const {
    isAdmin
  } = useRole();
  const {
    hasPaidAccess,
    campaignsRemaining,
    loading: subscriptionLoading
  } = useSubscription();
  const {
    toast
  } = useToast();
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt sur WineExporters !"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
        variant: "destructive"
      });
    }
  };
  return <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Grape className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-sidebar-foreground leading-tight">
              WineExporters
            </span>
            <span className="text-[10px] text-secondary">
              by ExportVins
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/campaigns" end className={getNavCls}>
                      <Shield className="h-4 w-4" />
                      <span>Campagnes Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Credits indicator */}
        {hasPaidAccess && !subscriptionLoading && <div className="px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2">
              <Zap className="h-4 w-4 text-primary-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-sidebar-foreground">
                  Crédits campagne
                </span>
                <span className="text-sm font-bold text-primary-foreground">
                  {campaignsRemaining} restant{campaignsRemaining !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>}
        
        {!hasPaidAccess && !subscriptionLoading && <div className="px-3 py-2">
            <NavLink to="/billing">
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 hover:bg-primary/20 transition-colors cursor-pointer">
                <Zap className="h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-sidebar-foreground">
                    Passer à Premium
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    1 campagne/mois incluse
                  </span>
                </div>
              </div>
            </NavLink>
          </div>}
        
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs text-sidebar-foreground truncate">
                  {user?.email}
                </span>
              </div>
              <SidebarMenuButton onClick={handleSignOut} className="h-8 w-8 hover:bg-sidebar-accent">
                <LogOut className="h-4 w-4" />
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>;
}