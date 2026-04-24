import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Grape } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
const Auth = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const handleSubmit = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast({ title: t('common.error'), description: t('auth.fillAllFields'), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
      if (error) {
        let errorMessage = t('auth.genericError');
        if (error.message.includes('Invalid login credentials')) errorMessage = t('auth.invalidCredentials');
        else if (error.message.includes('User already registered')) errorMessage = t('auth.userExists');
        else if (error.message.includes('Password should be at least')) errorMessage = t('auth.passwordTooShort');
        toast({ title: t('auth.errorTitle'), description: errorMessage, variant: "destructive" });
      } else {
        if (isSignUp) {
          toast({ title: t('auth.accountCreated'), description: t('auth.accountCreatedDescription') });
        } else {
          toast({ title: t('auth.signedIn'), description: t('auth.welcome') });
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
          <CardTitle className="text-2xl font-bold text-foreground">{t('auth.title')}</CardTitle>
          <CardDescription className="text-muted-foreground">{t('auth.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">{t('auth.email')}</Label>
                <Input id="signin-email" type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">{t('auth.password')}</Label>
                <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              </div>
              <Button onClick={() => handleSubmit(false)} className="w-full" disabled={loading}>
                {loading ? t('auth.signingIn') : t('auth.signInButton')}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">{t('auth.email')}</Label>
                <Input id="signup-email" type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">{t('auth.password')}</Label>
                <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              </div>
              <Button onClick={() => handleSubmit(true)} className="w-full" disabled={loading}>
                {loading ? t('auth.signingUp') : t('auth.signUpButton')}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};
export default Auth;
