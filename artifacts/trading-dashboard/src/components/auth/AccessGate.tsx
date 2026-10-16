import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";

type AccessState = "checking" | "locked" | "allowed" | "error";

const ACCESS_URL = `${import.meta.env.BASE_URL}api/access`;

export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>("checking");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const checkAccess = useCallback(async () => {
    try {
      const response = await fetch(`${ACCESS_URL}/status`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 503) {
        setMessage("تعذر التحقق من قائمة الدخول. لن يُفتح الموقع حتى تنجح المراجعة.");
        setState("error");
        return;
      }
      if (!response.ok) throw new Error("Access status check failed.");
      const result = await response.json() as { authorized?: boolean };
      setState(result.authorized ? "allowed" : "locked");
      if (!result.authorized) setMessage("");
    } catch {
      setMessage("تعذر الاتصال بخدمة التحقق. حاول مرة أخرى.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    if (state !== "allowed") return;
    const timer = window.setInterval(() => void checkAccess(), 15_000);
    return () => window.clearInterval(timer);
  }, [checkAccess, state]);

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${ACCESS_URL}/enter`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { authorized?: boolean; error?: string };
      if (response.ok && result.authorized) {
        setState("allowed");
      } else {
        setMessage(result.error ?? "تعذر فتح الموقع بهذا البريد.");
        setState("locked");
      }
    } catch {
      setMessage("تعذر الاتصال بخدمة التحقق. حاول مرة أخرى.");
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  if (state === "allowed") return children;

  return (
    <main className="access-screen" dir="rtl">
      <section className="access-card" aria-labelledby="access-title">
        <div className="access-mark" aria-hidden="true">
          {state === "checking" ? <RefreshCw className="access-spin" size={23} /> : <ShieldCheck size={25} />}
        </div>
        <p className="access-eyebrow">EG FINANCE FX</p>
        <h1 id="access-title">بوابة الدخول</h1>
        <p className="access-description">
          أدخل البريد الإلكتروني الذي أُضيف إلى قائمة الدخول لفتح لوحة التحليل.
        </p>

        {state === "checking" ? (
          <p className="access-status" role="status">جارٍ التحقق من صلاحية الوصول…</p>
        ) : state === "error" ? (
          <div className="access-error" role="alert">
            <p>{message}</p>
            <button className="access-retry" type="button" onClick={() => void checkAccess()}>
              <RefreshCw size={15} /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <form className="access-form" onSubmit={enter}>
            <label htmlFor="access-email">البريد الإلكتروني</label>
            <input
              id="access-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              dir="ltr"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              disabled={busy}
            />
            {message && <p className="access-error" role="alert">{message}</p>}
            <button className="access-submit" type="submit" disabled={busy}>
              {busy ? <RefreshCw className="access-spin" size={17} /> : <LockKeyhole size={17} />}
              {busy ? "جارٍ التحقق…" : "متابعة"}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        <div className="access-note">
          يتم فحص القائمة عند الدخول، ويُوقف الوصول عند حذف البريد منها.
        </div>
      </section>
    </main>
  );
}
