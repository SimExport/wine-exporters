import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TallyCsvImporter } from '@/components/admin/TallyCsvImporter';
import { TenderPdfImporter } from '@/components/admin/TenderPdfImporter';
import { SEO } from '@/components/SEO';

export default function AdminOpportunities() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <SEO title="Opportunités — Admin" description="Import et validation des demandes directes et appels d'offres." path="/admin/opportunites" />
      <div>
        <h1 className="text-2xl font-semibold">Opportunités</h1>
        <p className="text-sm text-muted-foreground">Importez les demandes directes (Tally) et les appels d'offres (PDF) à publier aux utilisateurs.</p>
      </div>
      <Tabs defaultValue="tally" className="w-full">
        <TabsList>
          <TabsTrigger value="tally">Demandes directes (Tally)</TabsTrigger>
          <TabsTrigger value="tender">Appels d'offres (PDF)</TabsTrigger>
        </TabsList>
        <TabsContent value="tally" className="mt-4">
          <TallyCsvImporter />
        </TabsContent>
        <TabsContent value="tender" className="mt-4">
          <TenderPdfImporter />
        </TabsContent>
      </Tabs>
    </div>
  );
}