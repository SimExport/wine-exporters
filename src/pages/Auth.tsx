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
const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const {
    signIn,
    signUp
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const handleSubmit = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = isSignUp ? await signUp(email, password) : await signIn(email, password);
      if (error) {
        let errorMessage = "Une erreur s'est produite";
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Email ou mot de passe incorrect";
        } else if (error.message.includes('User already registered')) {
          errorMessage = "Cet email est déjà utilisé";
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères";
        }
        toast({
          title: "Erreur d'authentification",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        if (isSignUp) {
          toast({
            title: "Compte créé avec succès",
            description: "Vérifiez votre email pour confirmer votre compte"
          });
        } else {
          toast({
            title: "Connexion réussie",
            description: "Bienvenue sur ExportVins !"
          });
          navigate('/');
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Grape className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Wine Exporters by ExportVins</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">Plateforme de prospection tout-en-un pour els domain</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input id="signin-email" type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Mot de passe</Label>
                <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              </div>
              <Button onClick={() => handleSubmit(false)} className="w-full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Mot de passe</Label>
                <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              </div>
              <Button onClick={() => handleSubmit(true)} className="w-full" disabled={loading}>
                {loading ? 'Création...' : 'Créer un compte'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};
export default Auth;