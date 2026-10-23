export type CrmAddOutcome = 'added' | 'existing';

/** Run the same single-prospect path sequentially, retaining successes on partial failure. */
export async function addSourcingProspects(
  indices: number[],
  add: (index: number) => Promise<CrmAddOutcome>,
) {
  const result = { added: 0, existing: 0, completed: [] as number[], failed: [] as number[] };
  for (const index of [...new Set(indices)]) {
    try {
      const outcome = await add(index);
      result[outcome] += 1;
      result.completed.push(index);
    } catch {
      result.failed.push(index);
    }
  }
  return result;
}

export function sourcingSelectionIndices(total: number, added: Set<number>, selected?: Set<number>) {
  return Array.from({ length: total }, (_, index) => index)
    .filter(index => !added.has(index) && (!selected || selected.has(index)));
}

/** Improve legacy plain-line summaries for display only; preserve stored content and Markdown. */
export function formatSourcingSummary(summary: string) {
  const lines = summary.replace(/\r\n/g, '\n').split('\n');
  let inCode = false;
  return lines.map((line, index) => {
    const text = line.trim();
    if (text.startsWith('```')) inCode = !inCode;
    if (inCode || !text || /^(?:[#>*|`]|[-+]\s|\d+[.)]\s)/.test(text)) return line;
    // Short standalone labels preceding body text become section headings.
    if (text.length <= 100 && !/[.!?;:]$/.test(text) && lines.slice(index + 1).some(next => next.trim())) {
      return `\n## ${text}\n`;
    }
    return line;
  }).join('\n');
}