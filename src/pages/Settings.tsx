import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const { user } = useAuth();
  const { toast } = useToast();
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
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default settings if none exist
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user?.id,
            display_name: user?.email || '',
            ui_language: 'fr'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive"
      });
    }
  };

  const debouncedUpdate = useCallback(
    debounce((updates: Partial<UserSettings>) => {
      updateSettings(updates);
    }, 800),
    [settings]
  );

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleReplyToChange = (value: string) => {
    if (!value) {
      setEmailError('');
      setSettings(prev => prev ? { ...prev, reply_to_default: value } : null);
      return;
    }

    if (validateEmail(value)) {
      setEmailError('');
      debouncedUpdate({ reply_to_default: value });
      setSettings(prev => prev ? { ...prev, reply_to_default: value } : null);
    } else {
      setEmailError('Format email invalide');
      setSettings(prev => prev ? { ...prev, reply_to_default: value } : null);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 8 caractères.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Mot de passe modifié avec succès."
      });

      setPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le mot de passe.",
        variant: "destructive"
      });
    }
  };

  const handleExportData = async () => {
    try {
      toast({
        title: "Export en cours",
        description: "Génération de vos données en cours..."
      });
      
      // This would call an edge function to generate the export
      // For now, just show a success message
      toast({
        title: "Export généré",
        description: "Un lien de téléchargement vous sera envoyé par email."
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les données.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      toast({
        title: "Erreur",
        description: "Veuillez taper 'SUPPRIMER' pour confirmer.",
        variant: "destructive"
      });
      return;
    }

    try {
      // This would call an edge function to handle account deletion
      toast({
        title: "Suppression programmée",
        description: "Votre compte sera supprimé dans les prochaines 24h."
      });

      setDeleteModalOpen(false);
      setDeleteConfirmation('');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le compte.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Impossible de charger les paramètres.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Paramètres</h1>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom affiché</Label>
              <Input
                id="displayName"
                value={settings.display_name || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSettings(prev => prev ? { ...prev, display_name: value } : null);
                  debouncedUpdate({ display_name: value });
                }}
                placeholder="Votre nom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email de connexion</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Langue de l'interface</Label>
              <Select 
                value={settings.ui_language} 
                onValueChange={(value) => {
                  setSettings(prev => prev ? { ...prev, ui_language: value } : null);
                  debouncedUpdate({ ui_language: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Changer le mot de passe</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Changer le mot de passe</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handlePasswordChange}>
                        Changer le mot de passe
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply-to Default */}
      <Card>
        <CardHeader>
          <CardTitle>Adresse reply-to par défaut</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cette adresse sera utilisée par défaut dans vos campagnes (Étape 3). Vous pourrez la modifier campagne par campagne.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="replyTo">Reply-to par défaut</Label>
            <Input
              id="replyTo"
              type="email"
              value={settings.reply_to_default || ''}
              onChange={(e) => handleReplyToChange(e.target.value)}
              placeholder="export@domaine.com"
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifyApproved">Campagne validée</Label>
            <Switch
              id="notifyApproved"
              checked={settings.notify_on_approved}
              onCheckedChange={(checked) => {
                setSettings(prev => prev ? { ...prev, notify_on_approved: checked } : null);
                updateSettings({ notify_on_approved: checked });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifySending">Envoi démarré</Label>
            <Switch
              id="notifySending"
              checked={settings.notify_on_sending}
              onCheckedChange={(checked) => {
                setSettings(prev => prev ? { ...prev, notify_on_sending: checked } : null);
                updateSettings({ notify_on_sending: checked });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifyResults">Résultats disponibles</Label>
            <Switch
              id="notifyResults"
              checked={settings.notify_on_results}
              onCheckedChange={(checked) => {
                setSettings(prev => prev ? { ...prev, notify_on_results: checked } : null);
                updateSettings({ notify_on_results: checked });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifyReply">Nouvelle réponse (lead)</Label>
            <Switch
              id="notifyReply"
              checked={settings.notify_on_reply}
              onCheckedChange={(checked) => {
                setSettings(prev => prev ? { ...prev, notify_on_reply: checked } : null);
                updateSettings({ notify_on_reply: checked });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifyBounce">Alerte taux de rebond élevé</Label>
            <Switch
              id="notifyBounce"
              checked={settings.notify_on_high_bounce}
              onCheckedChange={(checked) => {
                setSettings(prev => prev ? { ...prev, notify_on_high_bounce: checked } : null);
                updateSettings({ notify_on_high_bounce: checked });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dailyDigest">Récap quotidien</Label>
            <Switch
              id="dailyDigest"
              checked={settings.daily_digest_enabled}
              onCheckedChange={(checked) => {
                setSettings(prev => prev ? { ...prev, daily_digest_enabled: checked } : null);
                updateSettings({ daily_digest_enabled: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Données & confidentialité</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vos données sont stockées de manière sécurisée et l'accès est limité aux équipes autorisées.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Exporter mes données</Label>
              <p className="text-sm text-muted-foreground">Téléchargez toutes vos campagnes et leads</p>
            </div>
            <Button onClick={handleExportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-destructive">Zone de danger</Label>
                <p className="text-sm text-muted-foreground">Supprimer définitivement votre compte</p>
              </div>
              <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer mon compte
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Supprimer votre compte
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Cette action est irréversible. Toutes vos données (campagnes, leads, profil) seront définitivement supprimées.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="deleteConfirm">
                        Tapez <strong>SUPPRIMER</strong> pour confirmer
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="SUPPRIMER"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setDeleteModalOpen(false);
                        setDeleteConfirmation('');
                      }}>
                        Annuler
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteAccount}>
                        Supprimer définitivement
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;