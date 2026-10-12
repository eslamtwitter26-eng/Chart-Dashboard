const fieldBoundary = /^(?:pivot|our preference|alternative scenario|comments?|time[\s-]?frame|period|supports?|resistances?|support\s*(?:&|and)\s*resistance)\s*:/i;
const footerBoundary = /^(?:trade|trade now|watch now|back to top|web tv(?: from trading central)?|trading central terms and conditions)\s*$/i;

/** Preserve all paragraphs in a report field, stopping before the next field or footer. */
export function extractAnalysisField(lines: string[], label: string): string {
  const cleanLabel = label.replace(/:\s*$/, "");
  const escaped = cleanLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}\\s*:\\s*(.*)$`, "i");
  const start = lines.findIndex(line => pattern.test(line));
  if (start < 0) return "";
  const values: string[] = [];
  const inline = lines[start].match(pattern)?.[1]?.trim();
  if (inline) values.push(inline);
  for (const line of lines.slice(start + 1)) {
    if (fieldBoundary.test(line) || footerBoundary.test(line)
      || /^if you no longer wish|^risk warning:|^our pivot point is at/i.test(line)) break;
    if (line.trim()) values.push(line.trim());
  }
  return values.join("\n").trim();
}
