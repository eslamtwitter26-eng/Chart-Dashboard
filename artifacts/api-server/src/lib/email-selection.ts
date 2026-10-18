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
