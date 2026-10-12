export interface LayoutCell { c: number; r: number; cs: number; rs: number }
export interface LayoutDef { id: string; count: number; cols: number; rows: number; cells: LayoutCell[] }

export const LAYOUT_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16];
export const MAX_COUNT = 16;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

/** Lines of cells; counts[i] cells in line i. Horizontal => lines are rows. */
function lines(counts: number[], vertical: boolean, id: string): LayoutDef {
  const span = counts.reduce(lcm, 1);
  const cells: LayoutCell[] = [];
  counts.forEach((n, li) => {
    const s = span / n;
    for (let k = 0; k < n; k++) {
      cells.push(vertical
        ? { c: li + 1, r: k * s + 1, cs: 1, rs: s }
        : { r: li + 1, c: k * s + 1, rs: 1, cs: s });
    }
  });
  const n = cells.length;
  return vertical
    ? { id, count: n, cols: counts.length, rows: span, cells }
    : { id, count: n, cols: span, rows: counts.length, cells };
}

function split(n: number, parts: number): number[] {
  const base = Math.floor(n / parts), extra = n % parts;
  // smaller lines first so remainder lines get more cells
  return Array.from({ length: parts }, (_, i) => base + (i >= parts - extra ? 1 : 0));
}

function build(n: number): LayoutDef[] {
  const out: LayoutDef[] = [];
  const add = (d: LayoutDef) => { if (d.count === n && !out.some(o => o.id === d.id)) out.push(d); };
  if (n === 1) { add(lines([1], false, "r:1")); return out; }

  const root = Math.sqrt(n);
  const cand = new Set<number>();
  cand.add(Math.max(1, Math.round(root)));
  cand.add(Math.max(1, Math.floor(root)));
  cand.add(Math.ceil(root));
  for (let p = 1; p <= n; p++) if (n % p === 0 && p <= 6) cand.add(p);
  const parts = [...cand].filter(p => p >= 1 && p <= n).sort((a, b) => Math.abs(a - root) - Math.abs(b - root));

  const sq = parts[0];
  add(lines(split(n, sq), false, `r:${split(n, sq).join(",")}`));
  add(lines(split(n, sq), true, `c:${split(n, sq).join(",")}`));
  for (const p of parts.slice(1)) {
    const s = split(n, p);
    if (p === 1 || p === n) continue;
    add(lines(s, false, `r:${s.join(",")}`));
    add(lines(s, true, `c:${s.join(",")}`));
  }
  add(lines([n], false, `r:${n}`));
  add(lines(Array(n).fill(1), false, `r:${Array(n).fill(1).join(",")}`));
  // Unequal arrangements
  if (n >= 3) {
    const k = n - 1;
    add({ id: "ml", count: n, cols: 2, rows: k, cells: [{ c: 1, r: 1, cs: 1, rs: k }, ...Array.from({ length: k }, (_, i) => ({ c: 2, r: i + 1, cs: 1, rs: 1 }))] });
    add({ id: "mr", count: n, cols: 2, rows: k, cells: [...Array.from({ length: k }, (_, i) => ({ c: 1, r: i + 1, cs: 1, rs: 1 })), { c: 2, r: 1, cs: 1, rs: k }] });
    add({ id: "mt", count: n, cols: k, rows: 2, cells: [{ c: 1, r: 1, cs: k, rs: 1 }, ...Array.from({ length: k }, (_, i) => ({ c: i + 1, r: 2, cs: 1, rs: 1 }))] });
    add({ id: "mb", count: n, cols: k, rows: 2, cells: [...Array.from({ length: k }, (_, i) => ({ c: i + 1, r: 1, cs: 1, rs: 1 })), { c: 1, r: 2, cs: k, rs: 1 }] });
  }
  return out;
}

const cache = new Map<number, LayoutDef[]>();

export function getLayouts(n: number): LayoutDef[] {
  const c = Math.min(MAX_COUNT, Math.max(1, Math.floor(n) || 1));
  let l = cache.get(c);
  if (!l) { l = build(c); cache.set(c, l); }
  return l;
}

/** Valid layout for count n; falls back to the default (first) if id is unknown. */
export function resolveLayout(n: number, id?: string | null): LayoutDef {
  const list = getLayouts(n);
  return list.find(l => l.id === id) ?? list[0];
}

export function cellStyle(cell: LayoutCell) {
  return { gridColumn: `${cell.c} / span ${cell.cs}`, gridRow: `${cell.r} / span ${cell.rs}` };
}
