import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Menu,
  X,
  Target,
  User,
  Database,
  FileSearch,
  Sparkles,
  Kanban,
  Rocket,
  HelpCircle,
  Settings,
  CreditCard,
  Shield,
  UserPlus,
  UsersRound,
  LogOut,
  Grape,
} from 'lucide-react';

const navigationItems = [
  { key: 'dashboard', url: '/dashboard', icon: Target },
  { key: 'profile', url: '/profile', icon: User },
  { key: 'importers', url: '/importers', icon: Database },
  { key: 'campaigns', url: '/campaigns', icon: Target },
  { key: 'sourcing', url: '/recherches', icon: FileSearch },
  { key: 'opportunities', url: '/opportunites', icon: Sparkles },
  { key: 'crm', url: '/pipeline', icon: Kanban },
  { key: 'roadmap', url: '/roadmap', icon: Rocket },
  { key: 'help', url: '/help', icon: HelpCircle },
] as const;

const settingsItems = [
  { key: 'settings', url: '/settings', icon: Settings },
  { key: 'billing', url: '/billing', icon: CreditCard },
] as const;

const adminItems = [
  { key: 'adminCampaigns', url: '/admin/campaigns', icon: Shield },
  { key: 'adminSourcing', url: '/admin/recherches', icon: FileSearch },
  { key: 'adminInvitations', url: '/admin/invitations', icon: UserPlus },
  { key: 'adminUsers', url: '/admin/users', icon: UsersRound },
  { key: 'adminOpportunities', url: '/admin/opportunites', icon: Sparkles },
] as const;

export function MobileNav() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(`${path}/`);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/auth');
  };

  const renderLink = (item: typeof navigationItems[number]) => {
    const Icon = item.icon;
    const active = isActive(item.url);
    return (
      <DrawerClose asChild key={item.key}>
        <NavLink
          to={item.url}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
            active
              ? 'bg-primary/10 text-primary'
              : 'text-foreground hover:bg-muted'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span>{t(`nav.${item.key}`)}</span>
        </NavLink>
      </DrawerClose>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Grape className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold leading-tight">WineExporters</span>
          <span className="text-[10px] text-muted-foreground">by ExportVins</span>
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('mobileNav.menu')}>
            <Menu className="h-6 w-6" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh] px-2 pb-4">
          <DrawerHeader className="flex items-center justify-between border-b pb-3 pt-2 text-left">
            <DrawerTitle className="text-base">{t('mobileNav.title')}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label={t('common.close')}>
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <nav className="mt-2 flex flex-col gap-1 overflow-y-auto">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('nav.navigation')}
            </p>
            {navigationItems.map(renderLink)}

            {isAdmin && (
              <>
                <p className="mt-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('nav.administration')}
                </p>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.url);
                  return (
                    <DrawerClose asChild key={item.key}>
                      <NavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{t(`nav.${item.key}`)}</span>
                      </NavLink>
                    </DrawerClose>
                  );
                })}
              </>
            )}

            <p className="mt-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('nav.configuration')}
            </p>
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.url);
              return (
                <DrawerClose asChild key={item.key}>
                  <NavLink
                    to={item.url}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{t(`nav.${item.key}`)}</span>
                  </NavLink>
                </DrawerClose>
              );
            })}

            <div className="mt-4 border-t pt-3">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 text-sm font-medium text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {t('sidebar.signOut')}
              </Button>
            </div>
          </nav>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
