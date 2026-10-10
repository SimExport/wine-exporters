import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useCrmAccess } from '@/hooks/useCrmAccess'
import { Pencil } from 'lucide-react'

type Field = 'importer_description' | 'relevance_reason'

function Section({ leadId, field, title, value, canEdit, onSaved }: {
  leadId: string; field: Field; title: string; value: string | null; canEdit: boolean; onSaved: (v: string | null) => void
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  if (!value && !canEdit) return null

  const save = async () => {
    setSaving(true)
    const v = draft.trim() || null
    const { error } = await supabase.from('leads').update({ [field]: v } as any).eq('id', leadId)
    setSaving(false)
    if (error) { toast({ title: t('common.error', { defaultValue: 'Erreur' }), description: error.message, variant: 'destructive' }); return }
    onSaved(v); setEditing(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {canEdit && !editing && (
          <Button variant="ghost" size="sm" onClick={() => { setDraft(value ?? ''); setEditing(true) }}>
            <Pencil className="h-4 w-4 mr-1" />{t('prospectDetail.insights.edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>{t('prospectDetail.insights.save')}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>{t('prospectDetail.insights.cancel')}</Button>
            </div>
          </div>
        ) : value ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{value}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('prospectDetail.insights.empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ImporterInsights({ lead, onChange }: { lead: any; onChange: (patch: Record<string, string | null>) => void }) {
  const { t } = useTranslation()
  const access = useCrmAccess()
  const canEdit = !access.loading && !access.isReadonly && !access.isClosed
  return (
    <>
      <Section leadId={lead.id} field="importer_description" title={t('prospectDetail.insights.about')}
        value={lead.importer_description ?? null} canEdit={canEdit} onSaved={(v) => onChange({ importer_description: v })} />
      <Section leadId={lead.id} field="relevance_reason" title={t('prospectDetail.insights.relevance')}
        value={lead.relevance_reason ?? null} canEdit={canEdit} onSaved={(v) => onChange({ relevance_reason: v })} />
    </>
  )
}
