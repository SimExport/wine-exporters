import { useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, UserPlus } from "lucide-react";

const emailSchema = z.string().trim().email().max(255);

const AdminInvitations = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: t("adminInvitations.errorTitle"), description: t("adminInvitations.invalidEmail"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth`;
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: { email: parsed.data, redirectTo },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: t("adminInvitations.successTitle"), description: t("adminInvitations.successDesc", { email: parsed.data }) });
      setEmail("");
    } catch (err: any) {
      toast({ title: t("adminInvitations.errorTitle"), description: err?.message || t("adminInvitations.errorGeneric"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("adminInvitations.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("adminInvitations.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("adminInvitations.formTitle")}
          </CardTitle>
          <CardDescription>{t("adminInvitations.formDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t("adminInvitations.emailLabel")}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="contact@domaine.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                maxLength={255}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              <Mail className="h-4 w-4 mr-2" />
              {loading ? t("adminInvitations.sending") : t("adminInvitations.send")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvitations;