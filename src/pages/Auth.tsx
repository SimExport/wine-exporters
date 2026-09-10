import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SEO } from '@/components/SEO';
import { BrandLogo } from '@/components/BrandLogo';
const Auth = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: t('common.error'), description: t('auth.fillAllFields'), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        let errorMessage = t('auth.genericError');
        if (error.message.includes('Invalid login credentials')) errorMessage = t('auth.invalidCredentials');
        toast({ title: t('auth.errorTitle'), description: errorMessage, variant: "destructive" });
      } else {
        toast({ title: t('auth.signedIn'), description: t('auth.welcome') });
        if (safeNext) {
          window.location.href = safeNext;
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      toast({ title: t('common.error'), description: t('auth.unexpectedError') });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <SEO title={t('seo.auth.title')} description={t('seo.auth.description')} path="/auth" />
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BrandLogo className="h-16 w-auto max-w-[320px]" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">{t('auth.title')}</CardTitle>
          <CardDescription className="text-muted-foreground">{t('auth.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">{t('auth.email')}</Label>
              <Input id="signin-email" type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">{t('auth.password')}</Label>
              <PasswordInput id="signin-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              <div className="text-right">
                <Link to="/mot-de-passe-oublie" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                  {t('auth.forgot.link')}
                </Link>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.signingIn') : t('auth.signInButton')}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            {t('auth.noAccountQ')}{' '}
            <Link to="/demande-demo" className="text-primary font-medium hover:underline">
              {t('auth.requestDemo')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Auth;
