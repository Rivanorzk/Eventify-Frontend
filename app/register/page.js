"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  Phone,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import AuthLogo from "@/components/authLogo";
import useAuth from "@/hooks/useAuth";
import { register as registerService } from "@/services/authService";

const STRENGTH_LABELS = ["Sangat lemah", "Lemah", "Cukup", "Kuat", "Sangat kuat"];
const STRENGTH_COLORS = ["#D8A7A7", "#D8A7A7", "#D4A537", "#7A1F2B", "#5B0F18"];

function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

/* ---------------------------------------------------------
   INPUT FIELD (manual)
--------------------------------------------------------- */
function InputField({
  id,
  name,
  type = "text",
  label,
  placeholder,
  icon: Icon,
  value,
  onChange,
  onFocus,
  onBlur,
  autoComplete,
  disabled,
  rightElement,
  focused,
}) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-1 block text-[11px] font-semibold text-[#1E1E1E]/80"
      >
        {label}
      </label>
      <div
        className={`relative flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2.5 transition-all duration-300 ${
          focused
            ? "border-transparent ring-2 ring-[#D4A537]"
            : "border-[#E5D6D0]"
        } ${disabled ? "opacity-60" : ""}`}
      >
        {Icon && (
          <Icon
            className={`h-4 w-4 flex-shrink-0 transition-colors ${
              focused ? "text-[#7A1F2B]" : "text-[#A68C8C]"
            }`}
          />
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-sm font-medium text-[#1E1E1E] outline-none placeholder:text-[#1E1E1E]/30"
        />
        {rightElement && (
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const [usernameValid, setUsernameValid] = useState(null);
  const [emailValid, setEmailValid] = useState(null);
  const [phoneValid, setPhoneValid] = useState(null);
  const [passwordValid, setPasswordValid] = useState(null);
  const [confirmValid, setConfirmValid] = useState(null);

  const [dots, setDots] = useState([]);

  useEffect(() => {
    const newDots = Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * 12,
      opacity: 0.2 + Math.random() * 0.3,
    }));
    setDots(newDots);
  }, []);

  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const brandRef = useRef(null);
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  const handleBrandMouseMove = (e) => {
    const rect = brandRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSpot({ x, y });
  };

  const strength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "username") setUsernameValid(value.length >= 3);
    if (name === "email") {
      setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    }
    if (name === "phone") {
      setPhoneValid(/^08[0-9]{8,11}$/.test(value));
    }
    if (name === "password") {
      setPasswordValid(value.length >= 8);
      if (form.confirmPassword) {
        setConfirmValid(value === form.confirmPassword);
      }
    }
    if (name === "confirmPassword") {
      setConfirmValid(value === form.password);
    }
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.username ||
      !form.email ||
      !form.phone ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Password dan konfirmasi password tidak sama.");
      return;
    }
    if (!agreeTerms) {
      setError("Kamu harus menyetujui Terms of Service dan Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const response = await registerService({
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      const token = response?.data?.token || response?.token;
      const userData = response?.data?.user || response?.user || null;

      if (token) {
        const authenticatedUser = await login(token, userData);
        const target =
          authenticatedUser?.role === "admin"
            ? "/admin/dashboard"
            : authenticatedUser?.role === "superadmin"
            ? "/superadmin/dashboard"
            : "/customer/dashboard";
        router.replace(target);
        router.refresh();
        return;
      }

      router.replace("/login?registered=true");
    } catch (err) {
      console.error("Registration failed:", err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Registrasi gagal. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#F8F1E7]">
      {/* Background dekoratif dinamis */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#F8F1E7] via-[#F1E4DA] to-[#E8D5CC]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,_#D8A7A7_0%,_transparent_60%)] opacity-40" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_#D4A537_0%,_transparent_50%)] opacity-20" />

      <div className="absolute left-8 top-8 h-48 w-48 rounded-full bg-[#D8A7A7]/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-8 right-8 h-56 w-56 rounded-full bg-[#D4A537]/10 blur-3xl animate-pulse delay-1000" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7A1F2B]/5 blur-3xl animate-pulse delay-700" />

      <div
        className={`grid h-full w-full grid-cols-1 overflow-x-hidden lg:grid-cols-2 transition-all duration-700 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* SISI KIRI - Branding interaktif */}
        <section
          ref={brandRef}
          onMouseMove={handleBrandMouseMove}
          className="relative hidden h-full min-w-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#5B0F18] via-[#7A1F2B] to-[#3A0810] p-12 text-[#F8F1E7] lg:flex xl:p-16"
        >
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${spot.x}% ${spot.y}%, rgba(212,165,55,0.15), transparent 40%)`,
            }}
          />

          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#D4A537]/10 blur-2xl animate-spin-slow" />
          <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-[#D8A7A7]/10 blur-2xl animate-spin-slower" />

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
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#D8A7A7]/20 bg-[#D8A7A7]/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Your events, your experience.
            </span>
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
              {["Your next", "experience", "starts here."].map((line, idx) => (
                <span
                  key={idx}
                  className="block animate-fade-up"
                  style={{ animationDelay: `${idx * 120}ms` }}
                >
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-4 text-base text-[#D8A7A7] leading-relaxed">
              Buat akun Eventify dan mulai temukan berbagai event menarik
              yang sesuai dengan minatmu.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { icon: CalendarDays, text: "Temukan event favoritmu" },
                { icon: ShieldCheck, text: "Pesan tiket dengan mudah" },
                { icon: CheckCircle2, text: "Kelola semua tiketmu" },
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
              <div className="h-7 w-7 rounded-full border-2 border-[#5B0F18] bg-[#D8A7A7] transition-transform duration-300 hover:z-10 hover:scale-110" />
              <div className="h-7 w-7 rounded-full border-2 border-[#5B0F18] bg-[#7A1F2B] transition-transform duration-300 hover:z-10 hover:scale-110" />
              <div className="h-7 w-7 rounded-full border-2 border-[#5B0F18] bg-[#F8F1E7] transition-transform duration-300 hover:z-10 hover:scale-110" />
            </div>
            <span>Join thousands of event enthusiasts</span>
          </div>
        </section>

        {/* SISI KANAN - Form (diperkecil agar tidak overflow) */}
        <section className="flex h-full min-w-0 items-center justify-center overflow-y-auto overflow-x-hidden bg-white/40 px-5 py-6 backdrop-blur-sm sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex justify-center lg:hidden animate-fade-up">
              <AuthLogo />
            </div>

            <div className="mb-5 animate-fade-up">
              <h2 className="text-2xl font-bold text-[#1E1E1E] tracking-tight">
                Create your account
              </h2>
              <p className="mt-1 text-xs text-[#737373]">
                Start your journey with Eventify today.
              </p>
            </div>

            <div
              className={`transition-all duration-300 overflow-hidden ${
                error ? "max-h-24 mb-3 opacity-100" : "max-h-0 mb-0 opacity-0"
              }`}
            >
              <div className="flex items-start gap-2.5 rounded-lg border border-[#E8B8B8] bg-[#FFF4F4] px-3 py-2.5 animate-shake">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#7A1F2B]" />
                <p className="text-[11px] text-[#7A1F2B] leading-relaxed">
                  {error}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* username */}
              <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
                <InputField
                  id="username"
                  name="username"
                  type="text"
                  label="Username"
                  placeholder="Your username"
                  icon={User}
                  value={form.username}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="username"
                  disabled={loading}
                  focused={focusedField === "username"}
                  rightElement={
                    usernameValid !== null &&
                    form.username.length > 0 && (
                      <>
                        {usernameValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </>
                    )
                  }
                />
              </div>

              {/* email */}
              <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
                <InputField
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
                  focused={focusedField === "email"}
                  rightElement={
                    emailValid !== null &&
                    form.email.length > 0 && (
                      <>
                        {emailValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </>
                    )
                  }
                />
              </div>

              {/* phone */}
              <div className="animate-fade-up" style={{ animationDelay: "140ms" }}>
                <InputField
                  id="phone"
                  name="phone"
                  type="tel"
                  label="Phone number"
                  placeholder="08xxxxxxxxxx"
                  icon={Phone}
                  value={form.phone}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="tel"
                  disabled={loading}
                  focused={focusedField === "phone"}
                  rightElement={
                    phoneValid !== null &&
                    form.phone.length > 0 && (
                      <>
                        {phoneValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </>
                    )
                  }
                />
              </div>

              {/* password */}
              <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
                <InputField
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  placeholder="Create a password"
                  icon={Lock}
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="new-password"
                  disabled={loading}
                  focused={focusedField === "password"}
                  rightElement={
                    <>
                      {passwordValid !== null && form.password.length > 0 && (
                        <>
                          {passwordValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-[#A68C8C] transition-all duration-200 hover:text-[#5B0F18] hover:scale-110"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  }
                />

                {/* Indikator kekuatan password */}
                <div
                  className={`mt-1.5 flex items-center gap-2 overflow-hidden transition-all duration-300 ${
                    form.password.length > 0
                      ? "max-h-6 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full bg-[#E5D6D0] transition-colors duration-300"
                        style={{
                          backgroundColor:
                            i < strength ? STRENGTH_COLORS[strength] : "#E5D6D0",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-[10px] font-medium transition-colors duration-300"
                    style={{ color: STRENGTH_COLORS[strength] }}
                  >
                    {STRENGTH_LABELS[strength]}
                  </span>
                </div>
              </div>

              {/* confirm password */}
              <div className="animate-fade-up" style={{ animationDelay: "220ms" }}>
                <InputField
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  label="Confirm password"
                  placeholder="Confirm your password"
                  icon={Lock}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="new-password"
                  disabled={loading}
                  focused={focusedField === "confirmPassword"}
                  rightElement={
                    <>
                      {confirmValid !== null &&
                        form.confirmPassword.length > 0 && (
                          <>
                            {confirmValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </>
                        )}
                      <button
                        type="button"
                        onClick={() => setShowConfirm((prev) => !prev)}
                        className="text-[#A68C8C] transition-all duration-200 hover:text-[#5B0F18] hover:scale-110"
                      >
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  }
                />
              </div>

              {/* terms */}
              <div className="flex items-start gap-2 pt-0.5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#D8A7A7] accent-[#7A1F2B] transition-all duration-200 hover:scale-110"
                />
                <label
                  htmlFor="terms"
                  className="cursor-pointer text-[11px] leading-relaxed text-[#737373] transition hover:text-[#1E1E1E]"
                >
                  I agree to Eventify's{" "}
                  <Link
                    href="/terms"
                    className="font-medium text-[#7A1F2B] transition hover:text-[#5B0F18] underline-offset-2 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-[#7A1F2B] transition hover:text-[#5B0F18] underline-offset-2 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#5B0F18] text-sm font-semibold text-[#F8F1E7] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7A1F2B] hover:shadow-xl hover:shadow-[#5B0F18]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F8F1E7]/30 border-t-[#F8F1E7]" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-[11px] text-[#737373]">
                Sudah memiliki akun?{" "}
                <Link
                  href="/login"
                  className="relative font-semibold text-[#7A1F2B] transition hover:text-[#5B0F18] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#7A1F2B] after:transition-all after:duration-300 hover:after:w-full"
                >
                  Login
                </Link>
              </p>
            </div>

            <p className="mt-2.5 text-center text-[10px] leading-relaxed text-[#A68C8C]">
              By creating an account, you agree to Eventify's{" "}
              <Link
                href="/terms"
                className="text-[#7A1F2B] transition hover:underline underline-offset-2"
              >
                Terms
              </Link>{" "}
              &{" "}
              <Link
                href="/privacy"
                className="text-[#7A1F2B] transition hover:underline underline-offset-2"
              >
                Privacy
              </Link>
            </p>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slower {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-fade-up { opacity: 0; animation: fadeUp 0.6s ease-out forwards; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-shimmer { animation: shimmer 1.2s infinite; }
        .animate-float { animation: float ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-slower { animation: spin-slower 30s linear infinite; }
      `}</style>
    </main>
  );
}