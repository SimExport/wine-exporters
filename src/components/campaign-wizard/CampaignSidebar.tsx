import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, Target, Wine, FileText, Mail, Calendar } from "lucide-react"

interface CampaignSidebarProps {
  data: {
    markets: string[]
    channels: string[]
    segments: string[]
    volumeBand: string
    priceRange: { min: number; max: number }
    language: string
    audienceEstimate: number
    cuvees: string[]
    hasPresentationDoc: boolean
    hasPricelistDoc: boolean
    subject: string
    scheduleAt?: Date
  }
}

export function CampaignSidebar({ data }: CampaignSidebarProps) {
  return (
    <div className="w-80 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Globe className="w-4 h-4 mr-2" />
            Marchés & Ciblage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.markets.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Marchés prioritaires</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.markets.slice(0, 3).map((market) => (
                  <Badge key={market} variant="outline" className="text-xs">
                    {market}
                  </Badge>
                ))}
                {data.markets.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{data.markets.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {data.channels.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Canaux</p>
              <p className="text-sm">{data.channels.join(', ')}</p>
            </div>
          )}
          
          {data.audienceEstimate > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Audience estimée</p>
              <p className="text-sm font-medium text-primary">
                ≈ {data.audienceEstimate} contacts
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Wine className="w-4 h-4 mr-2" />
            Cuvées & Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.cuvees.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground">Cuvées sélectionnées</p>
              <p className="text-sm">{data.cuvees.join(', ')}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune cuvée sélectionnée</p>
          )}
          
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3" />
            <span className="text-xs">
              Présentation: {data.hasPresentationDoc ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3" />
            <span className="text-xs">
              Liste des prix: {data.hasPricelistDoc ? '✓' : '✗'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            Message & Planning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.subject && (
            <div>
              <p className="text-xs text-muted-foreground">Objet</p>
              <p className="text-xs">{data.subject}</p>
            </div>
          )}
          
          <div>
            <p className="text-xs text-muted-foreground">Langue</p>
            <Badge variant="outline" className="text-xs">
              {data.language}
            </Badge>
          </div>
          
          {data.scheduleAt && (
            <div>
              <p className="text-xs text-muted-foreground">Planifié pour</p>
              <p className="text-xs">{data.scheduleAt.toLocaleDateString('fr-FR')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}