"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No reset token found. Please request a new password reset link.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setSuccess(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ backgroundColor: "#3F3FF3" }}
      >
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-12">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "#3F3FF3" }} />
            </div>
            <h1 className="text-xl font-semibold text-white">DILI</h1>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <ShieldCheck className="text-white/30 w-20 h-20 mb-6" />
            <h2 className="text-4xl text-white mb-6 leading-tight">
              Secure your account with a new password.
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Choose a strong password to keep your DILI account and registered devices safe.
            </p>
          </div>
          <div className="flex justify-between items-center text-white/70 text-sm">
            <span>Copyright © 2025 Dili Ventures.</span>
            <span className="cursor-pointer hover:text-white/90">Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: "#3F3FF3" }}
            >
              <div className="w-4 h-4 bg-white rounded-sm" />
            </div>
            <h1 className="text-xl font-semibold">DILI</h1>
          </div>

          {success ? (
            <div className="text-center space-y-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Password Updated!</h2>
                <p className="text-slate-500 mt-2">
                  Your password has been changed successfully.
                </p>
              </div>
              <Link
                href="/"
                className="inline-block w-full py-3 rounded-lg text-white text-sm font-medium text-center"
                style={{ backgroundColor: "#3F3FF3" }}
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900">Set New Password</h2>
                <p className="text-slate-500 mt-2">Enter your new password below.</p>
              </div>

              {!token ? (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Invalid reset link. Please{" "}
                    <Link href="/" className="underline">request a new one</Link>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 block">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="At least 8 characters"
                        className="w-full h-12 pr-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#3F3FF3] text-sm"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 block">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Repeat your password"
                        className="w-full h-12 pr-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#3F3FF3] text-sm"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle size={14} /> {error}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: "#3F3FF3" }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </form>
              )}

              <div className="text-center text-sm text-slate-500">
                Remember your password?{" "}
                <Link href="/" className="font-medium" style={{ color: "#3F3FF3" }}>
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
