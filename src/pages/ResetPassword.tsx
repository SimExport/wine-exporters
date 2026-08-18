import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";

const ResetPassword = () => {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const isFr = i18n.language?.startsWith("fr");

  useEffect(() => {
    const init = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState(null, "", url.pathname);
      } else {
        const params = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast({
          title: isFr ? "Lien invalide ou expiré" : "Invalid or expired link",
          description: isFr
            ? "Veuillez demander un nouveau lien de réinitialisation."
            : "Please request a new reset link.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
        return;
      }
      setReady(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({
        title: isFr ? "Mot de passe trop court" : "Password too short",
        description: isFr ? "8 caractères minimum." : "8 characters minimum.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: isFr ? "Les mots de passe ne correspondent pas" : "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({
        title: isFr ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: isFr ? "Mot de passe mis à jour" : "Password updated",
      description: isFr ? "Vous êtes connecté." : "You are signed in.",
    });
    navigate("/dashboard", { replace: true });
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {isFr ? "Réinitialiser votre mot de passe" : "Reset your password"}
          </CardTitle>
          <CardDescription>
            {isFr
              ? "Choisissez un nouveau mot de passe pour votre compte."
              : "Choose a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {isFr ? "Nouveau mot de passe" : "New password"}
              </Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">
                {isFr ? "Confirmer le mot de passe" : "Confirm password"}
              </Label>
              <PasswordInput
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? isFr ? "Enregistrement…" : "Saving…"
                : isFr ? "Mettre à jour" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;