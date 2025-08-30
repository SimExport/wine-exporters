import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle } from "lucide-react"

interface PreflightError {
  id: string
  message: string
  anchor: string
}

interface PreflightBarProps {
  errors: PreflightError[]
  onFixClick: (anchor: string) => void
}

export function PreflightBar({ errors, onFixClick }: PreflightBarProps) {
  if (errors.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Tout est prêt. Vous pouvez lancer votre campagne.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>{errors.length} erreur(s) bloquante(s):</strong>
            <ul className="mt-1 space-y-1">
              {errors.map((error) => (
                <li key={error.id} className="flex items-center justify-between">
                  <span className="text-sm">{error.message}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onFixClick(error.anchor)}
                    className="ml-2 h-6 text-xs"
                  >
                    Corriger
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}