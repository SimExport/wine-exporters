import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Loader2 } from 'lucide-react';

interface ParseResult {
  total_candidates: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

export function ParseAddressesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const { toast } = useToast();

  const handleParse = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Erreur', description: 'Non authentifié', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('parse-addresses', {
        method: 'POST',
      });

      if (error) throw error;

      const res = data as ParseResult;
      setResult(res);
      toast({
        title: 'Parsing terminé',
        description: `${res.updated} mis à jour / ${res.skipped} ignorés sur ${res.total_candidates + res.skipped} contacts`,
      });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleParse}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
        Normaliser les adresses
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground">
          {result.updated} mis à jour / {result.skipped} ignorés sur {result.total_candidates + result.skipped} contacts
          {result.errors && ` · ${result.errors.length} erreur(s)`}
        </p>
      )}
    </div>
  );
}
