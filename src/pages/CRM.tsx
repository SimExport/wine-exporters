import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Kanban, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Pipeline from './Pipeline'
import Prospects from './Prospects'

type View = 'kanban' | 'list'
const STORAGE_KEY = 'crm-view-mode'

export default function CRM() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const initial: View = (() => {
    const fromUrl = searchParams.get('view')
    if (fromUrl === 'list' || fromUrl === 'kanban') return fromUrl
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'list' || stored === 'kanban') return stored
    }
    return 'kanban'
  })()

  const [view, setView] = useState<View>(initial)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, view)
    const current = searchParams.get('view')
    if (current !== view) {
      const next = new URLSearchParams(searchParams)
      next.set('view', view)
      setSearchParams(next, { replace: true })
    }
  }, [view])

  return (
    <div>
      <div className="container mx-auto pt-6 px-4 flex justify-end">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as View)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="kanban" aria-label={t('crm.viewKanban')}>
            <Kanban className="h-4 w-4 mr-2" />
            {t('crm.viewKanban')}
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label={t('crm.viewList')}>
            <List className="h-4 w-4 mr-2" />
            {t('crm.viewList')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {view === 'kanban' ? <Pipeline /> : <Prospects />}
    </div>
  )
}
