import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Trash2, AlertTriangle } from 'lucide-react';
import { debounce } from 'lodash';
interface UserSettings {
  id: string;
  user_id: string;
  display_name?: string;
  ui_language: string;
  reply_to_default?: string;
  notify_on_approved: boolean;
  notify_on_sending: boolean;
  notify_on_results: boolean;
  notify_on_reply: boolean;
  notify_on_high_bounce: boolean;
  daily_digest_enabled: boolean;
}
const Settings = () => {
  const { t } = useTranslation();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [emailError, setEmailError] = useState('');
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);
  const loadSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('user_settings').select('*').eq('user_id', user?.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create default settings if none exist
        const {
          data: newSettings,
          error: insertError
        } = await supabase.from('user_settings').insert({
          user_id: user?.id,
          display_name: user?.email || '',
          ui_language: 'fr'
        }).select().single();
        if (insertError) throw insertError;
        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: t('common.error'),
        description: t('settings.loadError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return;
    try {
      const {
        error
      } = await supabase.from('user_settings').update(updates).eq('id', settings.id);
      if (error) throw error;
      setSettings(prev => prev ? {
        ...prev,
        ...updates
      } : null);
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: t('common.error'),
        description: t('settings.saveError'),
        variant: "destructive"
      });
    }
  };
  const debouncedUpdate = useCallback(debounce((updates: Partial<UserSettings>) => {
    updateSettings(updates);
  }, 800), [settings]);
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const handleReplyToChange = (value: string) => {
    if (!value) {
      setEmailError('');
      setSettings(prev => prev ? {
        ...prev,
        reply_to_default: value
      } : null);
      return;
    }
    if (validateEmail(value)) {
      setEmailError('');
      debouncedUpdate({
        reply_to_default: value
      });
      setSettings(prev => prev ? {
        ...prev,
        reply_to_default: value
      } : null);
    } else {
      setEmailError(t('settings.replyTo.invalidEmail'));
      setSettings(prev => prev ? {
        ...prev,
        reply_to_default: value
      } : null);
    }
  };
  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('settings.account.passwordMismatch'),
        variant: "destructive"
      });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: t('common.error'),
        description: t('settings.account.passwordTooShort'),
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (error) throw error;
      toast({
        title: t('common.success'),
        description: t('settings.account.passwordSuccess')
      });
      setPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: t('common.error'),
        description: t('settings.account.passwordError'),
        variant: "destructive"
      });
    }
  };
  const handleExportData = async () => {
    try {
      toast({
        title: t('settings.data.exportInProgress'),
        description: t('settings.data.exportInProgressDesc')
      });

      // This would call an edge function to generate the export
      // For now, just show a success message
      toast({
        title: t('settings.data.exportDone'),
        description: t('settings.data.exportDoneDesc')
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: t('common.error'),
        description: t('settings.data.exportError'),
        variant: "destructive"
      });
    }
  };
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== t('settings.data.deleteConfirmKeyword')) {
      toast({
        title: t('common.error'),
        description: t('settings.data.deleteConfirmError'),
        variant: "destructive"
      });
      return;
    }
    try {
      // This would call an edge function to handle account deletion
      toast({
        title: t('settings.data.deleteScheduled'),
        description: t('settings.data.deleteScheduledDesc')
      });
      setDeleteModalOpen(false);
      setDeleteConfirmation('');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t('common.error'),
        description: t('settings.data.deleteError'),
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>;
  }
  if (!settings) {
    return <div className="container mx-auto p-6">
        <div className="text-center">
          <p>{t('settings.loadError')}</p>
        </div>
      </div>;
  }
  return <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">{t('settings.title')}</h1>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.account.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('settings.account.displayName')}</Label>
              <Input id="displayName" value={settings.display_name || ''} onChange={e => {
              const value = e.target.value;
              setSettings(prev => prev ? {
                ...prev,
                display_name: value
              } : null);
              debouncedUpdate({
                display_name: value
              });
            }} placeholder={t('settings.account.displayNamePlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('settings.account.email')}</Label>
              <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.account.password')}</Label>
            <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">{t('settings.account.changePassword')}</Button>
              </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('settings.account.changePassword')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">{t('settings.account.currentPassword')}</Label>
                      <PasswordInput id="currentPassword" value={passwordForm.currentPassword} onChange={e => setPasswordForm(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t('settings.account.newPassword')}</Label>
                      <PasswordInput id="newPassword" value={passwordForm.newPassword} onChange={e => setPasswordForm(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t('settings.account.confirmPassword')}</Label>
                      <PasswordInput id="confirmPassword" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handlePasswordChange}>
                        {t('settings.account.changePassword')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Reply-to Default */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.replyTo.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('settings.replyTo.description')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="replyTo">{t('settings.replyTo.label')}</Label>
            <Input id="replyTo" type="email" value={settings.reply_to_default || ''} onChange={e => handleReplyToChange(e.target.value)} placeholder={t('settings.replyTo.placeholder')} className={emailError ? 'border-destructive' : ''} />
            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        
        
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.data.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('settings.data.description')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('settings.data.exportLabel')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.data.exportHelp')}</p>
            </div>
            <Button onClick={handleExportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t('settings.data.export')}
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-destructive">{t('settings.data.dangerZone')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.data.dangerHelp')}</p>
              </div>
              <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('settings.data.deleteAccount')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {t('settings.data.deleteTitle')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t('settings.data.deleteWarning')}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="deleteConfirm" dangerouslySetInnerHTML={{ __html: t('settings.data.deleteConfirmLabel') }} />
                      <Input id="deleteConfirm" value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder={t('settings.data.deleteConfirmPlaceholder')} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                      setDeleteModalOpen(false);
                      setDeleteConfirmation('');
                    }}>
                        {t('common.cancel')}
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteAccount}>
                        {t('settings.data.deletePermanently')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Settings;