import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KeyRound, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  ACTIVATION_TYPES, RECOVERY_TYPES, RESEND_DELAY_SECONDS, classifyAuthError, hasLegacyParams,
  isValidCode, isValidEmail, normalizeCode, normalizeEmail, readLegacyParams, verifyCode, type CodeErrorKind,
  classifyResendError, identityOf, legacyPkceAction, sameIdentity, type VerifiedIdentity,
} from "@/lib/auth-code";

type Mode = "activation" | "recovery";
type Step = "checking" | "code" | "password";

const TXT = {
  fr: {
    activation: { title: "Activer votre compte", desc: "Saisissez votre email et le code reçu par email, puis choisissez votre mot de passe.", pwTitle: "Créer votre mot de passe", submit: "Créer mon mot de passe", done: "Mot de passe créé. Bienvenue !" },
    recovery: { title: "Réinitialiser votre mot de passe", desc: "Saisissez votre email et le code reçu par email, puis choisissez un nouveau mot de passe.", pwTitle: "Nouveau mot de passe", submit: "Enregistrer le mot de passe", done: "Mot de passe mis à jour." },
    email: "Email", code: "Code reçu par email", verify: "Vérifier le code", verifying: "Vérification…",
    password: "Mot de passe", confirm: "Confirmer le mot de passe", saving: "Enregistrement…",
    resend: "Recevoir un nouveau code", resendIn: (s: number) => `Nouveau code possible dans ${s} s`,
    resendFailed: "L'envoi du code a échoué. Réessayez dans quelques minutes.",
    resent: "Si un compte existe pour cet email, un nouveau code vient d'être envoyé. Seul le dernier code reçu est valable.",
    badEmail: "Adresse email invalide.", badCode: "Le code contient uniquement des chiffres (6 au minimum).",
    tooShort: "8 caractères minimum.", mismatch: "Les mots de passe ne correspondent pas.",
    errors: {
      invalid_or_expired: "Code incorrect, expiré ou déjà utilisé. Vérifiez le dernier email reçu ou demandez un nouveau code.",
      rate_limited: "Trop de tentatives. Patientez une minute avant de réessayer.",
      network: "Connexion impossible. Vérifiez votre réseau et réessayez.",
      unknown: "Une erreur est survenue. Réessayez ou demandez un nouveau code.",
    } as Record<CodeErrorKind, string>,
    legacy: "Ce lien a expiré ou a déjà été utilisé (certaines messageries ouvrent les liens automatiquement). Demandez un code ci-dessous.",
    noSession: "Votre session a expiré. Saisissez à nouveau un code.",
    back: "Retour à la connexion",
  },
  en: {
    activation: { title: "Activate your account", desc: "Enter your email and the code you received by email, then choose your password.", pwTitle: "Create your password", submit: "Create my password", done: "Password created. Welcome!" },
    recovery: { title: "Reset your password", desc: "Enter your email and the code you received by email, then choose a new password.", pwTitle: "New password", submit: "Save password", done: "Password updated." },
    email: "Email", code: "Code received by email", verify: "Verify code", verifying: "Verifying…",
    password: "Password", confirm: "Confirm password", saving: "Saving…",
    resend: "Get a new code", resendIn: (s: number) => `New code available in ${s}s`,
    resendFailed: "The code could not be sent. Please try again in a few minutes.",
    resent: "If an account exists for this email, a new code has just been sent. Only the latest code is valid.",
    badEmail: "Invalid email address.", badCode: "The code only contains digits (at least 6).",
    tooShort: "8 characters minimum.", mismatch: "Passwords do not match.",
    errors: {
      invalid_or_expired: "Incorrect, expired or already used code. Check the latest email or request a new code.",
      rate_limited: "Too many attempts. Please wait a minute and try again.",
      network: "Unable to connect. Check your network and try again.",
      unknown: "Something went wrong. Try again or request a new code.",
    } as Record<CodeErrorKind, string>,
    legacy: "This link has expired or was already used (some mail systems open links automatically). Request a code below.",
    noSession: "Your session expired. Please enter a code again.",
    back: "Back to sign in",
  },
};

export default function CodeAuthFlow({ mode }: { mode: Mode }) {
  const { i18n } = useTranslation();
  const T = i18n.language?.startsWith("en") ? TXT.en : TXT.fr;
  const M = T[mode];
  const navigate = useNavigate();
  const location = useLocation();
  const started = useRef(false);
  const [step, setStep] = useState<Step>("checking");
  const [email, setEmail] = useState<string>(((location.state as any)?.email as string) || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  // Account proven by the typed code or the legacy link; only this account may get a new password.
  const verified = useRef<VerifiedIdentity | null>(null);
  const accept = (user: any) => {
    verified.current = identityOf(user);
    if (!verified.current) return false;
    setEmail(verified.current.email); setStep("password"); return true;
  };
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>((location.state as any)?.sent ? T.resent : null);
  const [cooldown, setCooldown] = useState((location.state as any)?.sent ? RESEND_DELAY_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Old emails: handle their URL output exactly once, never auto-verify anything else.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const legacy = readLegacyParams(window.location.href);
    const strip = () => window.history.replaceState(window.history.state, "", window.location.pathname);
    if (!hasLegacyParams(legacy)) { setStep("code"); return; }
    (async () => {
      try {
        if (legacy.error) { setError(T.legacy); return; }
        if (legacy.pkceCode) {
          // Let the client finish its own URL detection first so the code is never exchanged twice.
          const { data: init } = await supabase.auth.getSession();
          const stillInUrl = new URL(window.location.href).searchParams.get("code") === legacy.pkceCode;
          const action = legacyPkceAction(stillInUrl, Boolean(init.session));
          if (action === "accept_client_session" && accept(init.session!.user)) return;
          if (action === "exchange") {
            const { data, error: e } = await supabase.auth.exchangeCodeForSession(legacy.pkceCode);
            if (!e && data?.session && accept(data.session.user)) return;
          }
          setError(T.legacy); return;
        }
        // #access_token: detectSessionInUrl owns the exchange; just wait for it and check it is this link's session.
        const { data } = await supabase.auth.getSession();
        if (data.session && data.session.access_token === legacy.accessToken && accept(data.session.user)) return;
        setError(T.legacy);
      } catch {
        setError(T.errors.network);
      } finally {
        strip();
        setStep((s) => (s === "checking" ? "code" : s));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!isValidEmail(email)) return setError(T.badEmail);
    if (!isValidCode(code)) return setError(T.badCode);
    setBusy(true);
    const r = await verifyCode(supabase, email, code, mode === "recovery" ? RECOVERY_TYPES : ACTIVATION_TYPES);
    setBusy(false);
    setCode("");
    if (!r.ok) return setError(T.errors[r.kind]);
    if (!accept(r.session.user)) setError(T.errors.unknown);
  };

  const onResend = async () => {
    setError(null); setInfo(null);
    if (!isValidEmail(email)) return setError(T.badEmail);
    setBusy(true);
    const clean = normalizeEmail(email);
    try {
      const { error: e } = mode === "recovery"
        ? await supabase.auth.resetPasswordForEmail(clean, { redirectTo: `${window.location.origin}/reset-password` })
        : await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/set-password` } });
      const outcome = classifyResendError(e);
      if (outcome === "rate_limited") { setError(T.errors.rate_limited); setCooldown(RESEND_DELAY_SECONDS); return; }
      if (outcome === "network") return setError(T.errors.network);
      if (outcome === "failed") return setError(T.resendFailed);
      // Known "no account" answers look like success: no enumeration, no account creation.
      setInfo(T.resent);
      setCooldown(RESEND_DELAY_SECONDS);
    } catch {
      setError(T.errors.network);
    } finally {
      setBusy(false);
    }
  };

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(T.tooShort);
    if (password !== confirm) return setError(T.mismatch);
    setBusy(true);
    try {
      // The validated session must still be the exact account proven by the code (another tab may have switched it).
      const { data: u, error: ue } = await supabase.auth.getUser();
      if (ue || !sameIdentity(verified.current, u.user)) {
        verified.current = null; setPassword(""); setConfirm(""); setStep("code");
        return setError(T.noSession);
      }
      const { error: pe } = await supabase.auth.updateUser({ password });
      if (pe) return setError(T.errors.unknown);
    } catch {
      return setError(T.errors.network);
    } finally {
      setBusy(false);
    }
    setInfo(M.done);
    navigate("/dashboard", { replace: true });
  };

  if (step === "checking") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step === "code" ? <MailCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
            {step === "code" ? M.title : M.pwTitle}
          </CardTitle>
          {step === "code" && <CardDescription>{M.desc}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {info && <p role="status" className="text-sm text-muted-foreground">{info}</p>}
          {step === "code" ? (
            <>
              <form onSubmit={onVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code-email">{T.email}</Label>
                  <Input id="code-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code-otp">{T.code}</Label>
                  <Input id="code-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={14} value={code}
                    onChange={(e) => setCode(normalizeCode(e.target.value))} required disabled={busy} className="tracking-[0.4em] text-center text-lg" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? T.verifying : T.verify}</Button>
              </form>
              <Button type="button" variant="outline" className="w-full" onClick={onResend} disabled={busy || cooldown > 0}>
                {cooldown > 0 ? T.resendIn(cooldown) : T.resend}
              </Button>
              <div className="text-center text-sm"><Link to="/auth" className="text-primary hover:underline">{T.back}</Link></div>
            </>
          ) : (
            <form onSubmit={onPassword} className="space-y-4">
              {email && <p className="text-sm text-muted-foreground">{normalizeEmail(email)}</p>}
              <div className="space-y-2">
                <Label htmlFor="password">{T.password}</Label>
                <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{T.confirm}</Label>
                <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? T.saving : M.submit}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
