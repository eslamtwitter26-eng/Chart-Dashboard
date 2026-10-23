import { useEffect, useRef } from "react";

/**
 * Run the supplied standalone HTML in its own document. Its chart library,
 * styles, storage and streaming lifecycle remain isolated from React widgets.
 * Unmounting this frame also tears down its WebSockets and animation loops.
 */
export function UploadedGoldLab({ theme }: { theme: "dark" | "light" }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const initialSrc = useRef(`${import.meta.env.BASE_URL}gold-lab/index.html?theme=${theme}`);
  const sendTheme = () => frame.current?.contentWindow?.postMessage(
    { type: "trading-dashboard-theme", theme }, window.location.origin,
  );
  useEffect(() => { sendTheme(); }, [theme]);

  return (
    <iframe
      ref={frame}
      title="Gold Lab"
      data-testid="gold-lab-uploaded"
      src={initialSrc.current}
      onLoad={sendTheme}
      referrerPolicy="no-referrer"
      style={{ flex: "1 1 0", width: "100%", minHeight: 0, border: 0, display: "block", background: "hsl(var(--bg))" }}
    />
  );
}
