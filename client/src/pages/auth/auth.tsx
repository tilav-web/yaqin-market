import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  authActions,
  authReducer,
  initialAuthState,
} from "@/reducers/auth-reducer";
import { authService } from "@/services/auth.service";

const DEFAULT_OTP_LENGTH = 6;

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function Auth() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const lastSubmittedOtp = useRef<string | null>(null);

  const showOtp = state.status === "success";
  const phoneDigits = useMemo(() => sanitizeDigits(state.phone), [state.phone]);
  const isOtpComplete = useMemo(
    () => state.otp.every((digit) => digit.length === 1),
    [state.otp],
  );
  const otpValue = useMemo(() => state.otp.join(""), [state.otp]);

  useEffect(() => {
    if (showOtp) {
      otpRefs.current[0]?.focus();
    }
  }, [showOtp]);

  useEffect(() => {
    if (!showOtp) {
      lastSubmittedOtp.current = null;
    }
  }, [showOtp]);

  const handlePhoneChange = (value: string) => {
    const digits = sanitizeDigits(value).slice(0, 9);
    dispatch(authActions.phoneChange(digits));
  };

  const handleSubmit = async () => {
    if (phoneDigits.length !== 9) {
      dispatch(
        authActions.submitError(
          "Telefon raqami 9 ta raqam bo'lishi kerak. Masalan: 991234567",
        ),
      );
      return;
    }

    dispatch(authActions.submitStart());
    try {
      await authService.sendOtp(phoneDigits);
      dispatch(authActions.submitSuccess(DEFAULT_OTP_LENGTH));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Server bilan aloqa yo'q. Keyinroq qayta urinib ko'ring.";
      dispatch(authActions.submitError(message));
      toast.error(message);
    }
  };

  const handleVerify = async () => {
    if (!isOtpComplete) {
      toast.error("Iltimos, 6 xonali kodni to'liq kiriting");
      return;
    }
    if (lastSubmittedOtp.current === otpValue) return;

    lastSubmittedOtp.current = otpValue;
    try {
      await authService.verifyOtp(phoneDigits, otpValue);
      toast.success("Tizimga muvaffaqiyatli kirdingiz");
      navigate("/");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "OTP tasdiqlashda xatolik yuz berdi.";
      toast.error(message);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = sanitizeDigits(value);
    if (!digits) {
      const next = [...state.otp];
      next[index] = "";
      dispatch(authActions.setOtp(next));
      return;
    }

    if (digits.length === 1) {
      const next = [...state.otp];
      next[index] = digits;
      dispatch(authActions.setOtp(next));
      otpRefs.current[index + 1]?.focus();
      return;
    }

    const nextOtp = [...state.otp];
    let cursor = index;
    for (const digit of digits) {
      if (cursor >= state.otpLength) break;
      nextOtp[cursor] = digit;
      cursor += 1;
    }
    dispatch(authActions.setOtp(nextOtp));
    otpRefs.current[Math.min(cursor, state.otpLength - 1)]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && state.otp[index] === "" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,var(--primary)/12%,transparent_45%),linear-gradient(180deg,white,#fff7f7)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-border bg-card/80 p-8 shadow-[0_20px_60px_-40px_rgba(239,68,68,0.6)] backdrop-blur">
          <div className="flex flex-col items-center gap-4 text-center">
            <img
              src="/logo-web.png"
              alt="Yaqin Market"
              className="h-24 w-auto"
            />
            <div>
              <p className="text-sm text-muted-foreground">
                Telefon raqamingizni kiriting, kodni yuboramiz
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <label className="text-sm font-medium text-foreground">
              Telefon raqam
            </label>
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 transition",
                state.errorMessage
                  ? "border-destructive/60 ring-2 ring-destructive/20"
                  : "focus-within:ring-2 focus-within:ring-ring/30",
              )}
            >
              <span className="text-sm font-semibold text-foreground">
                +998
              </span>
              <div className="h-5 w-px bg-border" />
              <input
                value={state.phone}
                onChange={(event) => handlePhoneChange(event.target.value)}
                inputMode="numeric"
                placeholder="99 123 45 67"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {state.errorMessage && (
              <p className="text-sm text-destructive">{state.errorMessage}</p>
            )}

            {showOtp && (
              <div className="mt-4">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span>SMS kodni kiriting</span>
                  <span>·</span>
                  <span>+998 {phoneDigits}</span>
                </div>
                <div className="mt-3 flex justify-center gap-2">
                  {Array.from({ length: state.otpLength }).map((_, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      value={state.otp[index] ?? ""}
                      onChange={(event) =>
                        handleOtpChange(index, event.target.value)
                      }
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      inputMode="numeric"
                      maxLength={1}
                      className="h-10 w-10 rounded-lg border border-border bg-background text-center text-base font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
                    />
                  ))}
                </div>
              </div>
            )}

            {!showOtp ? (
              <Button
                className="h-11 w-full rounded-xl text-sm font-semibold"
                onClick={handleSubmit}
                disabled={state.status === "loading"}
              >
                {state.status === "loading"
                  ? "Yuborilmoqda..."
                  : "SMS kod yuborish"}
              </Button>
            ) : (
              <Button
                className="h-11 w-full rounded-xl text-sm font-semibold"
                onClick={handleVerify}
                disabled={state.status === "loading"}
              >
                Kodni tasdiqlash
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
