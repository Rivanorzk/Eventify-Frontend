"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import AuthLogo from "@/components/authLogo";
import AuthInput from "@/components/authInput";
import { login as loginService } from "@/services/authService";
import useAuth from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailValid, setEmailValid] = useState(null);
  const [passwordValid, setPasswordValid] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [dots, setDots] = useState([]);

  useEffect(() => {
    // Hanya berjalan di klien
    const newDots = Array.from({ length: 24 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: 0.2 + Math.random() * 0.3,
    }));
    setDots(newDots);
  }, []);

  // Spotlight interaktif yang mengikuti kursor di sisi branding
  const brandRef = useRef(null);
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleBrandMouseMove = (e) => {
    const rect = brandRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSpot({ x, y });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "email") {
      setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    }
    if (name === "password") {
      setPasswordValid(value.length >= 8);
    }
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await loginService(form);
      const token = response?.data?.token || response?.token;
      const userData = response?.data?.user || response?.user || null;

      if (!token) throw new Error("Token login tidak ditemukan.");
      const authenticatedUser = await login(token, userData);
      if (!authenticatedUser) throw new Error("Data user tidak ditemukan.");

      const role = authenticatedUser.role?.toLowerCase();
      if (role === "customer") router.replace("/customer/dashboard");
      else if (role === "admin") router.replace("/admin/dashboard");
      else if (role === "superadmin") router.replace("/superadmin/dashboard");
      else throw new Error("Role user tidak dikenali.");
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Email atau password salah."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#F8F1E7]">
      {/* Background bergradasi dinamis */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#F8F1E7] via-[#F1E4DA] to-[#E8D5CC]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_#D8A7A7_0%,_transparent_60%)] opacity-40" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,_#D4A537_0%,_transparent_50%)] opacity-20" />

      <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-[#D8A7A7]/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-[#D4A537]/10 blur-3xl animate-pulse delay-1000" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7A1F2B]/5 blur-3xl animate-pulse delay-700" />

      {/* Layout fullscreen tanpa card */}
      <div
        className={`grid h-full w-full grid-cols-1 lg:grid-cols-2 transition-all duration-700 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* SISI KIRI — Branding interaktif */}
        <section
          ref={brandRef}
          onMouseMove={handleBrandMouseMove}
          className="relative hidden h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#5B0F18] via-[#7A1F2B] to-[#3A0810] p-12 text-[#F8F1E7] lg:flex xl:p-16"
        >
          {/* Spotlight yang mengikuti kursor */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${spot.x}% ${spot.y}%, rgba(212,165,55,0.15), transparent 40%)`,
            }}
          />

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#D4A537]/10 blur-2xl animate-spin-slow" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#D8A7A7]/10 blur-2xl animate-spin-slower" />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {dots.map((dot, i) => (
              <div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-white/30 animate-float"
                style={{
                  left: dot.left + "%",
                  top: dot.top + "%",
                  animationDuration: dot.duration + "s",
                  animationDelay: dot.delay + "s",
                  opacity: dot.opacity,
                }}
              />
            ))}
          </div>
          <div className="relative z-10">
            <AuthLogo dark size="lg" />
          </div>

          <div className="relative z-10 max-w-md animate-fade-up">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#D8A7A7]/20 bg-[#D8A7A7]/10 px-4 py-1 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome back.
            </span>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight">
              {["Your events.", "Your experience.", "Your Eventify."].map(
                (line, idx) => (
                  <span
                    key={idx}
                    className="block animate-fade-up"
                    style={{ animationDelay: `${idx * 120}ms` }}
                  >
                    {line}
                  </span>
                )
              )}
            </h1>
            <p className="mt-5 text-base text-[#D8A7A7] leading-relaxed">
              Masuk ke akun Eventify untuk menemukan event,
              mengelola tiket, dan menikmati pengalaman terbaikmu.
            </p>
            <div className="mt-7 space-y-3">
              {[
                { icon: CalendarDays, text: "Temukan event favoritmu" },
                { icon: ShieldCheck, text: "Pesan tiket dengan aman" },
                { icon: ArrowRight, text: "Kelola semua tiketmu" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group flex items-center gap-3 transition-transform duration-300 hover:translate-x-1.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8A7A7]/15 transition-colors duration-300 group-hover:bg-[#D4A537]/25">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-[#F8F1E7]/90">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm text-[#D8A7A7] animate-fade-up">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full border-2 border-[#5B0F18] bg-[#D8A7A7] transition-transform duration-300 hover:z-10 hover:scale-110" />
              <div className="h-8 w-8 rounded-full border-2 border-[#5B0F18] bg-[#7A1F2B] transition-transform duration-300 hover:z-10 hover:scale-110" />
              <div className="h-8 w-8 rounded-full border-2 border-[#5B0F18] bg-[#F8F1E7] transition-transform duration-300 hover:z-10 hover:scale-110" />
            </div>
            <span>Join thousands of event enthusiasts</span>
          </div>
        </section>

        {/* SISI KANAN — Form Login, fullscreen, scrollable jika perlu */}
        <section className="flex h-full items-center justify-center overflow-y-auto bg-white/40 px-6 py-10 backdrop-blur-sm sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden animate-fade-up">
              <AuthLogo />
            </div>

            <div className="mb-8 animate-fade-up">
              <h2 className="text-4xl font-bold text-[#1E1E1E] tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-[#737373]">
                Sign in to continue to Eventify.
              </p>
            </div>

            <div
              className={`transition-all duration-300 overflow-hidden ${
                error ? "max-h-24 mb-4 opacity-100" : "max-h-0 mb-0 opacity-0"
              }`}
            >
              <div className="flex items-start gap-3 rounded-xl border border-[#E8B8B8] bg-[#FFF4F4] px-4 py-3 animate-shake">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#7A1F2B]" />
                <p className="text-sm text-[#7A1F2B] leading-relaxed">{error}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div
                className="animate-fade-up"
                style={{ animationDelay: "80ms" }}
              >
                <AuthInput
                  id="email"
                  name="email"
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  icon={Mail}
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="email"
                  disabled={loading}
                  className={`transition-all duration-300 focus-within:ring-2 focus-within:ring-[#D4A537] focus-within:border-transparent ${
                    focusedField === "email" ? "scale-[1.01]" : ""
                  }`}
                  rightElement={
                    emailValid !== null && (
                      <div className="flex items-center">
                        {emailValid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 animate-in zoom-in" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                    )
                  }
                />
              </div>

              <div
                className="animate-fade-up"
                style={{ animationDelay: "140ms" }}
              >
                <AuthInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  placeholder="Enter your password"
                  icon={Lock}
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="current-password"
                  disabled={loading}
                  className={`transition-all duration-300 focus-within:ring-2 focus-within:ring-[#D4A537] focus-within:border-transparent ${
                    focusedField === "password" ? "scale-[1.01]" : ""
                  }`}
                  rightElement={
                    <>
                      {passwordValid !== null && form.password.length > 0 && (
                        <div className="mr-2 flex items-center">
                          {passwordValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-[#A68C8C] transition-all duration-200 hover:text-[#5B0F18] hover:scale-110"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </>
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="group flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#D8A7A7] accent-[#7A1F2B] transition-all duration-200 group-hover:scale-110"
                    disabled={loading}
                  />
                  <span className="text-xs text-[#737373] transition group-hover:text-[#1E1E1E]">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="relative text-xs font-semibold text-[#7A1F2B] transition hover:text-[#5B0F18] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-[#7A1F2B] after:transition-all after:duration-300 hover:after:w-full"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#5B0F18] text-sm font-semibold text-[#F8F1E7] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7A1F2B] hover:shadow-xl hover:shadow-[#5B0F18]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#F8F1E7]/30 border-t-[#F8F1E7]" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5D6D0]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#FBF6EE] px-3 text-xs text-[#A68C8C]">
                  Don't have an account?
                </span>
              </div>
            </div>

            <Link
              href="/register"
              className="group flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#D8A7A7] text-sm font-semibold text-[#5B0F18] transition-all duration-300 hover:border-[#7A1F2B] hover:bg-[#F8F1E7] hover:shadow-md active:scale-[0.98]"
            >
              Create an account
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-[#A68C8C]">
              By continuing, you agree to Eventify's{" "}
              <Link
                href="/terms"
                className="text-[#7A1F2B] transition hover:underline underline-offset-2"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-[#7A1F2B] transition hover:underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-6px);
          }
          75% {
            transform: translateX(6px);
          }
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-30px) scale(1.5);
            opacity: 0.6;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spin-slower {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .animate-fade-up {
          opacity: 0;
          animation: fadeUp 0.7s ease-out forwards;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        .animate-shimmer {
          animation: shimmer 1.2s infinite;
        }
        .animate-float {
          animation: float ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-spin-slower {
          animation: spin-slower 30s linear infinite;
        }
      `}</style>
    </main>
  );
}