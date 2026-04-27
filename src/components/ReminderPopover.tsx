import { useState } from 'react'
import { addDays, isPast, isToday } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, CalendarClock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatDateLong, getDateFnsLocale } from '@/lib/format'

interface ReminderPopoverProps {
  leadId: string
  remindAt?: string | null
  remindNote?: string | null
  onUpdate?: (remindAt: string | null, remindNote: string | null) => void
  size?: 'sm' | 'default'
}

function getReminderStatus(remindAt?: string | null): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!remindAt) return 'none'
  const date = new Date(remindAt)
  if (isPast(date) && !isToday(date)) return 'overdue'
  if (isToday(date)) return 'today'
  return 'upcoming'
}

export function ReminderPopover({ leadId, remindAt, remindNote, onUpdate, size = 'sm' }: ReminderPopoverProps) {
  const { t } = useTranslation()
  const dateLocale = getDateFnsLocale()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(remindAt ? new Date(remindAt) : undefined)
  const [note, setNote] = useState(remindNote || '')
  const [saving, setSaving] = useState(false)

  const status = getReminderStatus(remindAt)

  const handleSave = async (selectedDate: Date | null, selectedNote: string) => {
    setSaving(true)
    try {
      await supabase
        .from('leads')
        .update({
          remind_at: selectedDate ? selectedDate.toISOString() : null,
          remind_note: selectedDate ? (selectedNote || null) : null,
        })
        .eq('id', leadId)

      onUpdate?.(selectedDate ? selectedDate.toISOString() : null, selectedNote || null)
      toast({
        title: selectedDate ? t('reminders.savedTitle') : t('reminders.removedTitle'),
        description: selectedDate
          ? t('reminders.savedDescription', { date: formatDateLong(selectedDate) })
          : t('reminders.removedDescription'),
      })
      setOpen(false)
    } catch {
      toast({ title: t('reminders.errorTitle'), description: t('reminders.errorDescription'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleQuickSet = (days: number) => {
    const d = addDays(new Date(), days)
    setDate(d)
    handleSave(d, note)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDate(undefined)
    setNote('')
    handleSave(null, '')
  }

  const iconClass = cn('flex-shrink-0', {
    'text-destructive': status === 'overdue',
    'text-amber-500': status === 'today',
    'text-primary': status === 'upcoming',
    'text-muted-foreground opacity-40 hover:opacity-80': status === 'none',
  })

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn('focus:outline-none transition-opacity', iconClass)}
            title={remindAt
              ? t('reminders.tooltipSet', { date: formatDate(remindAt) })
              : t('reminders.tooltipAdd')}
          >
            <Bell className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{t('reminders.title')}</span>
            </div>

            {/* Quick buttons */}
            <div className="flex gap-2">
              {[
                { label: t('reminders.quick3'), days: 3 },
                { label: t('reminders.quick7'), days: 7 },
                { label: t('reminders.quick14'), days: 14 },
              ].map(({ label, days }) => (
                <Button
                  key={days}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleQuickSet(days)}
                  disabled={saving}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Date picker */}
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => setDate(d)}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn('p-0 pointer-events-auto')}
              locale={dateLocale}
            />

            {/* Note */}
            <Textarea
              placeholder={t('reminders.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm resize-none"
              rows={2}
            />

            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="sm"
                onClick={() => date && handleSave(date, note)}
                disabled={!date || saving}
              >
                {t('reminders.save')}
              </Button>
              {remindAt && (
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving}>
                  <BellOff className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline badge */}
      {remindAt && status !== 'none' && (
        <span
          className={cn('text-[10px] font-medium rounded-full px-1.5 py-0.5 leading-none flex items-center gap-1', {
            'bg-destructive/10 text-destructive': status === 'overdue',
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400': status === 'today',
            'bg-primary/10 text-primary': status === 'upcoming',
          })}
        >
          {status === 'overdue' && '⚠ '}
          {formatDate(remindAt).slice(0, 5)}
          <button onClick={handleClear} className="opacity-60 hover:opacity-100">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      )}
    </div>
  )
}
