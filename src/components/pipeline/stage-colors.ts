export interface StageColor {
  value: string
  labelKey: string
}

// Restricted, design-system-aligned palette. Values are stored as-is in
// `pipeline_stages.color`. We use raw hex here (not CSS variables) because
// these are user data, not theme tokens — they must remain stable across themes.
export const STAGE_COLOR_PALETTE: StageColor[] = [
  { value: '#64748B', labelKey: 'pipeline.stageColors.slate' },
  { value: '#9F1239', labelKey: 'pipeline.stageColors.bordeaux' },
  { value: '#D97706', labelKey: 'pipeline.stageColors.amber' },
  { value: '#16A34A', labelKey: 'pipeline.stageColors.green' },
  { value: '#2563EB', labelKey: 'pipeline.stageColors.blue' },
  { value: '#7C3AED', labelKey: 'pipeline.stageColors.violet' },
  { value: '#6B7280', labelKey: 'pipeline.stageColors.gray' },
  { value: '#E11D48', labelKey: 'pipeline.stageColors.rose' },
]

export const DEFAULT_STAGE_COLOR = '#64748B'

// Colors aligned by index with DEFAULT_STAGE_NAMES in Pipeline.tsx (8 stages).
export const DEFAULT_STAGE_COLORS: string[] = [
  '#64748B', // À classer        — slate
  '#2563EB', // Échantillons à envoyer — blue
  '#7C3AED', // Échantillons envoyés   — violet
  '#D97706', // Échantillons réceptionnés — amber
  '#E11D48', // Échantillons dégustés — rose
  '#9F1239', // Négociation       — bordeaux
  '#16A34A', // Commande          — green
  '#6B7280', // Archivé           — gray
]

export function getStageColor(color?: string | null): string {
  if (!color) return DEFAULT_STAGE_COLOR
  return color
}