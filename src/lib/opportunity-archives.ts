export type OpportunityType = 'importer' | 'tender'

export const opportunityKey = (type: OpportunityType, id: string) => `${type}:${id}`

/** Only the current user's archive keys are passed here; shared rows stay intact. */
export function partitionOpportunities<T extends { id: string }>(
  rows: T[], type: OpportunityType, archivedKeys: ReadonlySet<string>,
) {
  return {
    active: rows.filter(row => !archivedKeys.has(opportunityKey(type, row.id))),
    archived: rows.filter(row => archivedKeys.has(opportunityKey(type, row.id))),
  }
}