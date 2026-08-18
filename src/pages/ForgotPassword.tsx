import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Grape, MailCheck } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error && !/user/i.test(error.message)) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-1.5 flex items-center justify-center">
                <Grape className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-tight text-left">
                <span className="font-bold text-base text-foreground">WineExporters</span>
                <span className="text-xs text-muted-foreground">by ExportVins</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">{t("auth.forgot.title")}</CardTitle>
          <CardDescription className="text-muted-foreground">{t("auth.forgot.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <MailCheck className="h-10 w-10 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">{t("auth.forgot.sent")}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">{t("auth.forgot.backToSignIn")}</Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{t("auth.email")}</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.forgot.sending") : t("auth.forgot.submit")}
                </Button>
              </form>
              <div className="mt-6 pt-6 border-t border-border text-center text-sm">
                <Link to="/auth" className="text-primary font-medium hover:underline">
                  {t("auth.forgot.backToSignIn")}
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
