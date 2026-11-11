
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from "lucide-react";

import AuthLogo from "@/components/authLogo";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const STEPS = ["email", "otp", "reset"];
const STEP_LABELS = ["Email", "Kode OTP", "Password baru"];

const formatTime = (total) => {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const errorMessage = (err) =>
  err.response?.data?.message || "Tidak dapat terhubung ke server.";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const [passwords, setPasswords] = useState({
    password: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetExpiresAt, setResetExpiresAt] = useState(0);
  const [resetSecondsLeft, setResetSecondsLeft] = useState(0);

  const [resendLeft, setResendLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isVisible, setIsVisible] = useState(false);
  const [dots, setDots] = useState([]);
  const [focusedField, setFocusedField] = useState(null);

  const brandRef = useRef(null);
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  // Background animation
  useEffect(() => {
    const newDots = Array.from({ length: 24 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: 0.2 + Math.random() * 0.3,
    }));

    setDots(newDots);
    setIsVisible(true);
  }, []);

  // Spotlight effect
  const handleBrandMouseMove = (e) => {
    const rect = brandRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSpot({ x, y });
  };

  // Countdown resend OTP
  useEffect(() => {
    if (resendLeft <= 0) return;

    const id = setTimeout(() => {
      setResendLeft((n) => n - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [resendLeft]);

  // Countdown reset token
  useEffect(() => {
    if (step !== "reset" || !resetExpiresAt) return;

    const tick = () => {
      const left = Math.max(
        0,
        Math.round((resetExpiresAt - Date.now()) / 1000)
      );

      setResetSecondsLeft(left);

      if (left === 0) {
        setResetToken("");
        setPasswords({ password: "", confirm: "" });
        setOtp("");
        setStep("email");
        setError(
          "Sesi reset password sudah habis. Silakan ulangi dari awal."
        );
      }
    };

    tick();

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, resetExpiresAt]);

  // Request OTP
  const requestOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${API_URL}/auth/forgot-password/otp`,
        {
          email: email.trim(),
        }
      );

      setDemoOtp(data.data.otp || "");
      setOtp("");
      setResendLeft(data.data.resend_in || 30);
      setStep("otp");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Submit email
  const handleEmail = async (e) => {
    e.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    await requestOtp();
  };

  // Verify OTP
  const handleOtp = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${API_URL}/auth/forgot-password/verify-otp`,
        {
          email: email.trim(),
          otp,
        }
      );

      setResetToken(data.data.reset_token);
      setResetExpiresAt(
        Date.now() + data.data.expires_in * 1000
      );

      setDemoOtp("");
      setStep("reset");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (passwords.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (passwords.password !== passwords.confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        reset_token: resetToken,
        password: passwords.password,
      });

      setResetToken("");
      setPasswords({ password: "", confirm: "" });
      setStep("done");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Change email
  const changeEmail = () => {
    setStep("email");
    setOtp("");
    setDemoOtp("");
    setError("");
  };

  const inputClass = `
    w-full h-12 rounded-xl border border-[#E5D6D0]
    bg-white/80 px-4 text-sm text-[#1E1E1E]
    placeholder:text-[#A68C8C] outline-none
    transition-all duration-300
    focus:border-[#D4A537] focus:ring-2
    focus:ring-[#D4A537]/20
    disabled:opacity-60
  `;

  const buttonClass = `
    group relative flex h-12 w-full items-center
    justify-center gap-2 overflow-hidden rounded-xl
    bg-[#5B0F18] text-sm font-semibold text-[#F8F1E7]
    transition-all duration-300 hover:-translate-y-0.5
    hover:bg-[#7A1F2B] hover:shadow-xl
    hover:shadow-[#5B0F18]/20 active:scale-[0.98]
    disabled:cursor-not-allowed disabled:opacity-60
  `;

  const renderSteps = () => {
    const activeIndex = STEPS.indexOf(step);

    return (
      <div className="mb-9">
        <div className="flex items-center justify-between">
          {STEPS.map((item, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;

            return (
              <div
                key={item}
                className="flex flex-1 items-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`
                      flex h-9 w-9 items-center justify-center
                      rounded-full text-xs font-bold transition-all
                      duration-300
                      ${
                        done || active
                          ? "bg-[#5B0F18] text-[#F8F1E7] shadow-lg shadow-[#5B0F18]/20"
                          : "bg-[#F1E4DA] text-[#A68C8C]"
                      }
                    `}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <span
                    className={`whitespace-nowrap text-[10px] font-semibold sm:text-xs ${
                      active
                        ? "text-[#5B0F18]"
                        : "text-[#A68C8C]"
                    }`}
                  >
                    {STEP_LABELS[index]}
                  </span>
                </div>

                {index !== STEPS.length - 1 && (
                  <div
                    className={`mx-2 mb-5 h-[2px] flex-1 rounded-full transition-colors ${
                      done ? "bg-[#7A1F2B]" : "bg-[#E5D6D0]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderError = () => (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        error
          ? "mb-5 max-h-24 opacity-100"
          : "mb-0 max-h-0 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 rounded-xl border border-[#E8B8B8] bg-[#FFF4F4] px-4 py-3 animate-shake">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#7A1F2B]" />
        <p className="text-sm leading-relaxed text-[#7A1F2B]">
          {error}
        </p>
      </div>
    </div>
  );

  return (
    <main className="relative min-h-screen w-screen overflow-hidden bg-[#F8F1E7]">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#F8F1E7] via-[#F1E4DA] to-[#E8D5CC]" />

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_#D8A7A7_0%,_transparent_60%)] opacity-40" />

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,_#D4A537_0%,_transparent_50%)] opacity-20" />

      <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-[#D8A7A7]/10 blur-3xl animate-pulse" />

      <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-[#D4A537]/10 blur-3xl animate-pulse" />

      {/* MAIN LAYOUT */}
      <div
        className={`grid min-h-screen w-full grid-cols-1 transition-all duration-700 lg:grid-cols-2 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >

        {/* LEFT BRANDING PANEL */}
        <section
          ref={brandRef}
          onMouseMove={handleBrandMouseMove}
          className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-[#5B0F18] via-[#7A1F2B] to-[#3A0810] p-12 text-[#F8F1E7] lg:flex xl:p-16"
        >
          {/* Spotlight */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${spot.x}% ${spot.y}%, rgba(212,165,55,0.15), transparent 40%)`,
            }}
          />

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#D4A537]/10 blur-2xl animate-spin-slow" />

          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#D8A7A7]/10 blur-2xl animate-spin-slower" />

          {/* Floating dots */}
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
              <ShieldCheck className="h-3.5 w-3.5" />
              Account Security
            </span>

            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight">
              {[
                "Your account.",
                "Your security.",
                "Your Eventify.",
              ].map((line, idx) => (
                <span
                  key={idx}
                  className="block animate-fade-up"
                  style={{
                    animationDelay: `${idx * 120}ms`,
                  }}
                >
                  {line}
                </span>
              ))}
            </h1>

            <p className="mt-5 text-base leading-relaxed text-[#D8A7A7]">
              Pulihkan akses akun Eventify kamu dengan
              mudah dan aman. Ikuti beberapa langkah
              untuk membuat password baru.
            </p>

            <div className="mt-7 space-y-3">
              {[
                {
                  icon: Mail,
                  text: "Verifikasi alamat email",
                },
                {
                  icon: KeyRound,
                  text: "Konfirmasi kode OTP",
                },
                {
                  icon: Lock,
                  text: "Buat password baru",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group flex items-center gap-3 transition-transform duration-300 hover:translate-x-1.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8A7A7]/15 transition-colors duration-300 group-hover:bg-[#D4A537]/25">
                    <item.icon className="h-4 w-4" />
                  </div>

                  <span className="text-sm text-[#F8F1E7]/90">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm text-[#D8A7A7] animate-fade-up">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full border-2 border-[#5B0F18] bg-[#D8A7A7]" />
              <div className="h-8 w-8 rounded-full border-2 border-[#5B0F18] bg-[#7A1F2B]" />
              <div className="h-8 w-8 rounded-full border-2 border-[#5B0F18] bg-[#F8F1E7]" />
            </div>

            <span>Your events. Your experience.</span>
          </div>
        </section>

        {/* RIGHT FORM PANEL */}
        <section className="flex min-h-screen items-center justify-center overflow-y-auto bg-white/40 px-6 py-10 backdrop-blur-sm sm:px-10 lg:px-16 xl:px-24">

          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="mb-8 flex justify-center animate-fade-up lg:hidden">
              <AuthLogo />
            </div>

            {/* SUCCESS */}
            {step === "done" ? (
              <div className="text-center animate-fade-up">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F4E8] text-[#3D8B52]">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <h2 className="mt-7 text-3xl font-bold tracking-tight text-[#1E1E1E]">
                  Password berhasil diubah!
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-[#737373]">
                  Password akun Eventify kamu sudah
                  berhasil diperbarui. Silakan masuk
                  menggunakan password baru.
                </p>

                <Link
                  href="/login"
                  className={`${buttonClass} mt-8`}
                >
                  Kembali ke Login
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />

                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                </Link>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="mb-8 animate-fade-up">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7A1F2B]/10 text-[#7A1F2B]">
                    {step === "email" && (
                      <Mail className="h-6 w-6" />
                    )}

                    {step === "otp" && (
                      <KeyRound className="h-6 w-6" />
                    )}

                    {step === "reset" && (
                      <Lock className="h-6 w-6" />
                    )}
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight text-[#1E1E1E] sm:text-4xl">
                    {step === "email" && "Forgot password?"}
                    {step === "otp" && "Verify your email"}
                    {step === "reset" && "Create new password"}
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-[#737373]">
                    {step === "email" &&
                      "Jangan khawatir! Masukkan email yang terdaftar untuk memulihkan akun Eventify kamu."}

                    {step === "otp" &&
                      `Masukkan kode OTP 6 digit untuk ${email}. Kode berlaku selama 5 menit.`}

                    {step === "reset" &&
                      "Buat password baru untuk mengamankan kembali akun Eventify kamu."}
                  </p>
                </div>

                {/* STEPPER */}
                {renderSteps()}

                {/* ERROR */}
                {renderError()}

                {/* EMAIL FORM */}
                {step === "email" && (
                  <form
                    onSubmit={handleEmail}
                    className="space-y-5 animate-fade-up"
                  >
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-xs font-semibold text-[#737373]"
                      >
                        Email address
                      </label>

                      <div
                        className={`flex h-12 items-center rounded-xl border bg-white/80 px-4 transition-all duration-300 ${
                          focusedField === "email"
                            ? "scale-[1.01] border-transparent ring-2 ring-[#D4A537]"
                            : "border-[#E5D6D0]"
                        }`}
                      >
                        <Mail className="mr-3 h-5 w-5 shrink-0 text-[#A68C8C]" />

                        <input
                          id="email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                          }}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField(null)}
                          disabled={loading}
                          className="h-full w-full bg-transparent text-sm text-[#1E1E1E] outline-none placeholder:text-[#A68C8C]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className={buttonClass}
                    >
                      {loading ? (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#F8F1E7]/30 border-t-[#F8F1E7]" />
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          Send verification code
                          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}

                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                    </button>
                  </form>
                )}

                {/* OTP FORM */}
                {step === "otp" && (
                  <div className="animate-fade-up">

                    {demoOtp && (
                      <div className="mb-5 rounded-xl border border-[#D4A537]/40 bg-[#F8F1E7] p-4">
                        <div className="flex items-center gap-2 text-[#7A1F2B]">
                          <ShieldCheck className="h-5 w-5" />
                          <p className="text-sm font-semibold">
                            Development Mode
                          </p>
                        </div>

                        <p className="mt-2 text-xs text-[#737373]">
                          Email belum benar-benar dikirim.
                          Gunakan kode OTP berikut:
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-2xl font-bold tracking-[0.35em] text-[#5B0F18]">
                            {demoOtp}
                          </span>

                          <button
                            type="button"
                            onClick={() => setOtp(demoOtp)}
                            className="text-xs font-semibold text-[#7A1F2B] underline underline-offset-4 hover:text-[#5B0F18]"
                          >
                            Isi otomatis
                          </button>
                        </div>
                      </div>
                    )}

                    <form
                      onSubmit={handleOtp}
                      className="space-y-5"
                    >
                      <div>
                        <label
                          htmlFor="otp"
                          className="mb-2 block text-xs font-semibold text-[#737373]"
                        >
                          Verification code
                        </label>

                        <div
                          className={`flex h-14 items-center rounded-xl border bg-white/80 px-4 transition-all duration-300 ${
                            focusedField === "otp"
                              ? "border-transparent ring-2 ring-[#D4A537]"
                              : "border-[#E5D6D0]"
                          }`}
                        >
                          <KeyRound className="mr-3 h-5 w-5 shrink-0 text-[#A68C8C]" />

                          <input
                            id="otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                            maxLength={6}
                            placeholder="••••••"
                            value={otp}
                            onChange={(e) => {
                              setOtp(
                                e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6)
                              );
                              setError("");
                            }}
                            onFocus={() => setFocusedField("otp")}
                            onBlur={() => setFocusedField(null)}
                            disabled={loading}
                            className="h-full w-full bg-transparent text-center font-mono text-xl font-bold tracking-[0.5em] text-[#5B0F18] outline-none placeholder:text-[#D8A7A7]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className={buttonClass}
                      >
                        {loading ? (
                          <>
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#F8F1E7]/30 border-t-[#F8F1E7]" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify OTP
                            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                          </>
                        )}

                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                      </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={changeEmail}
                        disabled={loading}
                        className="font-medium text-[#737373] transition hover:text-[#5B0F18] hover:underline"
                      >
                        Change email
                      </button>

                      <button
                        type="button"
                        onClick={requestOtp}
                        disabled={loading || resendLeft > 0}
                        className="flex items-center gap-1.5 font-semibold text-[#7A1F2B] transition hover:text-[#5B0F18] disabled:cursor-not-allowed disabled:text-[#A68C8C]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />

                        {resendLeft > 0
                          ? `Resend (${resendLeft}s)`
                          : "Resend code"}
                      </button>
                    </div>
                  </div>
                )}

                {/* RESET PASSWORD FORM */}
                {step === "reset" && (
                  <div className="animate-fade-up">

                    <div className="mb-5 flex items-center justify-between rounded-xl border border-[#D8A7A7]/40 bg-[#F8F1E7] px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-[#5B0F18]">
                          Reset session
                        </p>
                        <p className="mt-1 text-[11px] text-[#A68C8C]">
                          Complete before expiration
                        </p>
                      </div>

                      <span className="font-mono text-lg font-bold text-[#7A1F2B]">
                        {formatTime(resetSecondsLeft)}
                      </span>
                    </div>

                    <form
                      onSubmit={handleReset}
                      className="space-y-5"
                    >
                      <div>
                        <label
                          htmlFor="password"
                          className="mb-2 block text-xs font-semibold text-[#737373]"
                        >
                          New password
                        </label>

                        <div
                          className={`flex h-12 items-center rounded-xl border bg-white/80 px-4 transition-all duration-300 ${
                            focusedField === "password"
                              ? "border-transparent ring-2 ring-[#D4A537]"
                              : "border-[#E5D6D0]"
                          }`}
                        >
                          <Lock className="mr-3 h-5 w-5 shrink-0 text-[#A68C8C]" />

                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Minimum 8 characters"
                            value={passwords.password}
                            onChange={(e) =>
                              setPasswords({
                                ...passwords,
                                password: e.target.value,
                              })
                            }
                            onFocus={() => setFocusedField("password")}
                            onBlur={() => setFocusedField(null)}
                            disabled={loading}
                            className="h-full w-full bg-transparent text-sm text-[#1E1E1E] outline-none placeholder:text-[#A68C8C]"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => !prev)
                            }
                            className="ml-2 text-[#A68C8C] transition hover:text-[#5B0F18]"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>

                        <p className="mt-2 text-[11px] text-[#A68C8C]">
                          Password minimal 8 karakter.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="confirm"
                          className="mb-2 block text-xs font-semibold text-[#737373]"
                        >
                          Confirm new password
                        </label>

                        <div
                          className={`flex h-12 items-center rounded-xl border bg-white/80 px-4 transition-all duration-300 ${
                            focusedField === "confirm"
                              ? "border-transparent ring-2 ring-[#D4A537]"
                              : "border-[#E5D6D0]"
                          }`}
                        >
                          <Lock className="mr-3 h-5 w-5 shrink-0 text-[#A68C8C]" />

                          <input
                            id="confirm"
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="new-password"
                            placeholder="Repeat your password"
                            value={passwords.confirm}
                            onChange={(e) =>
                              setPasswords({
                                ...passwords,
                                confirm: e.target.value,
                              })
                            }
                            onFocus={() => setFocusedField("confirm")}
                            onBlur={() => setFocusedField(null)}
                            disabled={loading}
                            className="h-full w-full bg-transparent text-sm text-[#1E1E1E] outline-none placeholder:text-[#A68C8C]"
                          />
                        </div>
                      </div>

                      <label className="group flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showPassword}
                          onChange={(e) =>
                            setShowPassword(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-[#D8A7A7] accent-[#7A1F2B]"
                        />

                        <span className="text-xs text-[#737373] transition group-hover:text-[#1E1E1E]">
                          Show password
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={loading}
                        className={buttonClass}
                      >
                        {loading ? (
                          <>
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#F8F1E7]/30 border-t-[#F8F1E7]" />
                            Saving password...
                          </>
                        ) : (
                          <>
                            Reset password
                            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                          </>
                        )}

                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                      </button>
                    </form>
                  </div>
                )}

                {/* FOOTER */}
                <div className="relative my-7">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E5D6D0]" />
                  </div>

                  <div className="relative flex justify-center">
                    <span className="bg-[#FBF6EE] px-3 text-xs text-[#A68C8C]">
                      Remember your password?
                    </span>
                  </div>
                </div>

                <Link
                  href="/login"
                  className="group flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#D8A7A7] text-sm font-semibold text-[#5B0F18] transition-all duration-300 hover:border-[#7A1F2B] hover:bg-[#F8F1E7] hover:shadow-md active:scale-[0.98]"
                >
                  Back to Sign in
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <p className="mt-6 text-center text-[11px] leading-relaxed text-[#A68C8C]">
                  Secure your account and enjoy your
                  experience with Eventify.
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      {/* ANIMATIONS */}
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
          0%, 100% {
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
          0%, 100% {
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
