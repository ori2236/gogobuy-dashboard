import { useState } from "react";
import { LockKeyhole, LogIn, RefreshCw } from "lucide-react";
import logo from "../assets/gogobuy.ai.logo.png";
import { loginDashboard } from "../lib/api";

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await loginDashboard(username, password);
      onLogin?.(res.user);
    } catch (err) {
      setError(err?.message || "שגיאה בהתחברות");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8" dir="rtl">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <form onSubmit={submit} className="card w-full overflow-hidden p-6 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 p-3 shadow-md">
              <img src={logo} alt="gogobuy" className="h-full w-full object-contain" />
            </div>
            <div className="mt-5 text-2xl font-extrabold text-slate-900">
              כניסה לדשבורד
            </div>
            <div className="mt-1 text-sm text-slate-600">
              רק משתמש מסוג מלקט יכול להיכנס
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-1 text-right">
              <span className="text-xs font-bold text-slate-700">שם משתמש</span>
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin"
                disabled={busy}
              />
            </label>

            <label className="grid gap-1 text-right">
              <span className="text-xs font-bold text-slate-700">סיסמה</span>
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="הקלד סיסמה"
                disabled={busy}
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : null}

          <button className="btn-primary mt-5 w-full py-3" disabled={busy}>
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            התחבר
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <LockKeyhole className="h-3.5 w-3.5" />
            הגישה לשאר הדשבורד נחסמת עד התחברות
          </div>
        </form>
      </div>
    </div>
  );
}
