import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface PremiumOnlyStateProps {
  title?: string;
  description?: string;
  showButton?: boolean;
}

export const PremiumOnlyState = ({
  title = "Accès réservé aux membres abonnés",
  description = "Passez Premium pour accéder à 15 000+ acheteurs qualifiés dans le monde entier.",
  showButton = true,
}: PremiumOnlyStateProps) => {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-6">
          <Lock className="h-10 w-10 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {title}
        </h2>
        
        <p className="text-muted-foreground max-w-md mb-8">
          {description}
        </p>

        {showButton && (
          <Button 
            size="lg" 
            onClick={() => navigate('/billing')}
            className="gap-2"
          >
            <Crown className="h-5 w-5" />
            Passer Premium
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
