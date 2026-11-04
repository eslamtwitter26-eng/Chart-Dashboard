export async function findFirstEmailWithCards<T extends { cards: readonly unknown[] }>(
  messageIds: readonly string[],
  parseMessage: (messageId: string) => Promise<T | null>,
): Promise<T | null> {
  for (const messageId of messageIds) {
    const parsed = await parseMessage(messageId);
    if (parsed?.cards.length) return parsed;
  }
  return null;
}

export async function findLatestEmailWithCards<T extends {
  cards: readonly unknown[];
  receivedAt: string;
}>(
  candidateGroups: readonly (readonly string[])[],
  parseMessage: (messageId: string) => Promise<T | null>,
): Promise<T | null> {
  const parsedById = new Map<string, T | null>();
  let latest: T | null = null;

  for (const group of candidateGroups) {
    // Search results are newest-first, so the first usable report in each
    // query is that query's newest report. Compare those across queries.
    for (const messageId of group) {
      let parsed: T | null;
      if (parsedById.has(messageId)) {
        parsed = parsedById.get(messageId) ?? null;
      } else {
        parsed = await parseMessage(messageId);
        parsedById.set(messageId, parsed);
      }

      if (!parsed?.cards.length) continue;

      const parsedTime = Date.parse(parsed.receivedAt);
      const latestTime = latest ? Date.parse(latest.receivedAt) : Number.NEGATIVE_INFINITY;
      if (!latest || (Number.isFinite(parsedTime) && (!Number.isFinite(latestTime) || parsedTime > latestTime))) {
        latest = parsed;
      }
      break;
    }
  }

  return latest;
}
