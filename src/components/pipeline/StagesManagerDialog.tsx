import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { GripVertical, Trash2, Plus } from 'lucide-react'

export interface PipelineStage {
  id: string
  name: string
  position: number
  color?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  stages: PipelineStage[]
  prospectsCountByStage: Record<string, number>
  userId: string
  onChanged: () => Promise<void> | void
}

export function StagesManagerDialog({ open, onOpenChange, stages, prospectsCountByStage, userId, onChanged }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [localStages, setLocalStages] = useState<PipelineStage[]>(stages)
  const [newName, setNewName] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sync local state when dialog opens or props change
  if (open && localStages !== stages && localStages.length === 0 && stages.length > 0) {
    setLocalStages(stages)
  }

  const refresh = async () => {
    const { data } = await supabase
      .from('pipeline_stages' as any)
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    setLocalStages((data as any) || [])
    await onChanged()
  }

  const handleRename = async (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const original = stages.find(s => s.id === id)
    if (original && original.name === trimmed) return
    const { error } = await supabase
      .from('pipeline_stages' as any)
      .update({ name: trimmed })
      .eq('id', id)
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: t('pipeline.manageStages.toasts.renamed') })
    await refresh()
  }

  const handleDelete = async (id: string) => {
    const count = prospectsCountByStage[id] || 0
    if (count > 0) {
      toast({
        title: t('common.error'),
        description: t('pipeline.manageStages.errors.notEmpty'),
        variant: 'destructive',
      })
      return
    }
    const { error } = await supabase
      .from('pipeline_stages' as any)
      .delete()
      .eq('id', id)
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: t('pipeline.manageStages.toasts.deleted') })
    setLocalStages(prev => prev.filter(s => s.id !== id))
    await refresh()
  }

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setSaving(true)
    const nextPosition = (localStages[localStages.length - 1]?.position ?? -1) + 1
    const { error } = await supabase
      .from('pipeline_stages' as any)
      .insert({ user_id: userId, name: trimmed, position: nextPosition })
    setSaving(false)
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' })
      return
    }
    setNewName('')
    toast({ title: t('pipeline.manageStages.toasts.created') })
    await refresh()
  }

  const handleDragStart = (id: string) => setDraggedId(id)

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDropOn = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }
    const current = [...localStages]
    const fromIdx = current.findIndex(s => s.id === draggedId)
    const toIdx = current.findIndex(s => s.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = current.splice(fromIdx, 1)
    current.splice(toIdx, 0, moved)
    const reordered = current.map((s, idx) => ({ ...s, position: idx }))
    setLocalStages(reordered)
    setDraggedId(null)

    // Persist new positions in parallel
    const updates = await Promise.all(
      reordered.map(s =>
        supabase.from('pipeline_stages' as any).update({ position: s.position }).eq('id', s.id),
      ),
    )
    const firstError = updates.find(u => u.error)?.error
    if (firstError) {
      toast({ title: t('common.error'), description: firstError.message, variant: 'destructive' })
    } else {
      toast({ title: t('pipeline.manageStages.toasts.reordered') })
    }
    await refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setLocalStages(stages) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('pipeline.manageStages.title')}</DialogTitle>
          <DialogDescription>{t('pipeline.manageStages.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {localStages.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('pipeline.manageStages.empty')}</p>
          )}
          {localStages.map(stage => (
            <div
              key={stage.id}
              draggable
              onDragStart={() => handleDragStart(stage.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDropOn(stage.id)}
              className="flex items-center gap-2 p-2 rounded-md border bg-card"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <Input
                defaultValue={stage.name}
                onBlur={(e) => handleRename(stage.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-6 text-center">
                {prospectsCountByStage[stage.id] || 0}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(stage.id)}
                aria-label={t('pipeline.manageStages.delete')}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('pipeline.manageStages.addPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />
          <Button onClick={handleAdd} disabled={saving || !newName.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            {t('pipeline.manageStages.add')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}