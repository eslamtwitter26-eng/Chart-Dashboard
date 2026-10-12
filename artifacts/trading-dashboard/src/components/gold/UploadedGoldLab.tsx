/**
 * Run the supplied standalone HTML in its own document. Its chart library,
 * styles, storage and streaming lifecycle remain isolated from React widgets.
 * Unmounting this frame also tears down its WebSockets and animation loops.
 */
export function UploadedGoldLab(_props: { theme: "dark" | "light" }) {
  return (
    <iframe
      title="Gold Lab — PAXG/USDT"
      data-testid="gold-lab-uploaded"
      src={`${import.meta.env.BASE_URL}gold-lab/index.html`}
      referrerPolicy="no-referrer"
      style={{ flex: "1 1 0", width: "100%", minHeight: 0, border: 0, display: "block", background: "#0e0d0a" }}
    />
  );
}
