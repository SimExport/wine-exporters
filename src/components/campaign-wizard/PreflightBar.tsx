import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
  if (errors.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          {t('campaigns.preflightBar.ready')}
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
            <strong>{t('campaigns.preflightBar.errorsCount', { count: errors.length })}</strong>
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
                    {t('campaigns.preflightBar.fix')}
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