import { User, Database, Target, Settings, CreditCard, Grape, LogOut, Shield, Kanban, Zap, Rocket, Bell, Megaphone, Users, CheckCheck, Trash2, HelpCircle, UserPlus, FileSearch, UsersRound, Sparkles } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { formatRelative } from '@/lib/format';

const navigationItems = [
  { key: "dashboard", url: "/dashboard", icon: Target },
  { key: "profile", url: "/profile", icon: User },
  { key: "importers", url: "/importers", icon: Database },
  { key: "campaigns", url: "/campaigns", icon: Target },
  { key: "sourcing", url: "/recherches", icon: FileSearch },
  { key: "opportunities", url: "/opportunites", icon: Sparkles },
  { key: "crm", url: "/pipeline", icon: Kanban },
  { key: "roadmap", url: "/roadmap", icon: Rocket },
  { key: "help", url: "/help", icon: HelpCircle },
] as const;

const settingsItems = [
  { key: "settings", url: "/settings", icon: Settings },
  { key: "billing", url: "/billing", icon: CreditCard },
] as const;

export function AppSidebar() {
  const { t } = useTranslation();
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
  const { notifications, unreadCount, markAllRead, clearAll, addNotification } = useNotifications();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
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
        title: t('sidebar.signOutSuccess'),
        description: t('sidebar.signOutDescription')
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('sidebar.signOutError'),
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
          <SidebarGroupLabel>{t('nav.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map(item => <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(`nav.${item.key}`)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && <SidebarGroup>
            <SidebarGroupLabel>{t('nav.administration')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/campaigns" end className={getNavCls}>
                      <Shield className="h-4 w-4" />
                      <span>{t('nav.adminCampaigns')}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/recherches" end className={getNavCls}>
                      <FileSearch className="h-4 w-4" />
                      <span>{t('nav.adminSourcing')}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/invitations" end className={getNavCls}>
                      <UserPlus className="h-4 w-4" />
                      <span>{t('nav.adminInvitations')}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/users" end className={getNavCls}>
                      <UsersRound className="h-4 w-4" />
                      <span>{t('nav.adminUsers')}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/opportunites" end className={getNavCls}>
                      <Sparkles className="h-4 w-4" />
                      <span>{t('nav.adminOpportunities')}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.configuration')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map(item => <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(`nav.${item.key}`)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Language switcher */}
        <div className="px-3 pt-2 group-data-[collapsible=icon]:hidden">
          <LanguageSwitcher variant="sidebar" />
        </div>

        {/* Notifications bell */}
        <div className="px-3 py-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-sidebar-accent/50 transition-colors text-sidebar-foreground">
                <Bell className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium group-data-[collapsible=icon]:hidden">{t('sidebar.notifications')}</span>
                {unreadCount > 0 && (
                  <span className="absolute left-7 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-80 p-0" sideOffset={8}>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold">{t('sidebar.notifications')}</span>
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors">
                      <CheckCheck className="h-3 w-3" />
                      {t('sidebar.markAllRead')}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={clearAll} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('sidebar.noNotifications')}</p>
                  </div>
                ) : (
                  notifications.map(notif => {
                    const Icon = notif.type === 'new_lead' ? Users : Megaphone;
                    return (
                      <button
                        key={notif.id}
                        onClick={() => { markAllRead(); navigate(notif.link); }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 ${!notif.read ? 'bg-primary/5' : ''}`}
                      >
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${notif.type === 'new_lead' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground leading-tight">{notif.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-snug line-clamp-2">{notif.description}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            {formatRelative(notif.created_at)}
                          </p>
                        </div>
                        {!notif.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {!hasPaidAccess && !subscriptionLoading && <div className="px-3 py-2">
            <NavLink to="/billing">
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 hover:bg-primary/20 transition-colors cursor-pointer">
                <Zap className="h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-sidebar-foreground">
                    {t('sidebar.upgradeToPremium')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t('sidebar.upgradeIncluded')}
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