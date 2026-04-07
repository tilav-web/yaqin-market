import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  authActions,
  authReducer,
  initialAuthState,
} from "@/reducers/auth-reducer";
import { authService } from "@/services/auth.service";
import { getRoleHomePath } from "@/lib/market";
import { useAuthStore } from "@/stores/auth.store";
import { persistDiscoveryPreferences } from "@/hooks/use-discovery-preferences";
import { telegramAuthService } from "@/services/telegram-auth.service";
import type { TelegramWebAppUser } from "@/interfaces/telegram-auth.interface";

const DEFAULT_OTP_LENGTH = 6;

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function captureDiscoveryLocation() {
  return new Promise<void>((resolve) => {
    if (!navigator.geolocation) {
      resolve();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        persistDiscoveryPreferences({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
        resolve();
      },
      () => resolve(),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const setMe = useAuthStore((state) => state.setMe);
  const setSessionSource = useAuthStore((state) => state.setSessionSource);
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [telegramCheckState, setTelegramCheckState] = useState<{
    checking: boolean;
    available: boolean;
    requiresPhoneVerification: boolean;
    telegramUser: TelegramWebAppUser | null;
  }>({
    checking: false,
    available: false,
    requiresPhoneVerification: false,
    telegramUser: null,
  });
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

  useEffect(() => {
    const initData = telegramAuthService.getTelegramInitData();
    if (!initData) {
      return;
    }

    let cancelled = false;
    setTelegramCheckState({
      checking: true,
      available: true,
      requiresPhoneVerification: false,
      telegramUser: null,
    });

    telegramAuthService
      .createTelegramSession()
      .then(async (session) => {
        if (!session || cancelled) return;

        if (session.linked && session.access_token) {
          const me = await authService.findMe();
          if (cancelled) return;
          setMe(me);
          setSessionSource("telegram");
          if (me.role !== "SUPER_ADMIN") {
            await captureDiscoveryLocation();
          }
          toast.success("Telegram orqali tizimga kirildi");
          navigate(returnTo && returnTo.startsWith("/mobile") ? returnTo : getRoleHomePath(me.role), { replace: true });
          return;
        }

        setTelegramCheckState({
          checking: false,
          available: true,
          requiresPhoneVerification: Boolean(
            session.requires_phone_verification,
          ),
          telegramUser: session.telegram_user ?? null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Telegram sessiyasini tekshirib bo'lmadi",
        );
        setTelegramCheckState({
          checking: false,
          available: true,
          requiresPhoneVerification: true,
          telegramUser: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, setMe, setSessionSource]);

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
      const result = await authService.sendOtp(phoneDigits);
      dispatch(authActions.submitSuccess(DEFAULT_OTP_LENGTH));
      toast.success(result.message ?? "Tasdiqlash kodi yuborildi");
      if (result.otp_preview) {
        toast.info(`Test OTP: ${result.otp_preview}`);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Server bilan aloqa yo'q. Keyinroq qayta urinib ko'ring.";
      dispatch(authActions.submitError(message));
      toast.error(message);
    }
  };

  const handleTelegramPhoneRequest = async () => {
    try {
      const sharedFromMiniApp =
        await telegramAuthService.requestContactFromMiniApp();

      if (sharedFromMiniApp) {
        toast.success("Telefon raqami Telegram orqali yuborildi");

        const session = await telegramAuthService.waitForLinkedTelegramSession();
        if (session?.linked && session.access_token) {
          const me = await authService.findMe();
          setMe(me);
          setSessionSource("telegram");
          if (me.role !== "SUPER_ADMIN") {
            await captureDiscoveryLocation();
          }
          toast.success("Telegram orqali tizimga kirildi");
          navigate(returnTo && returnTo.startsWith("/mobile") ? returnTo : getRoleHomePath(me.role), { replace: true });
          return;
        }

        toast.message(
          "Telefon yuborildi. Agar avtologin kechiksa, tugmani yana bir marta bosib ko'ring.",
        );
        return;
      }

      const result = await telegramAuthService.requestTelegramPhoneVerification();
      toast.success(
        result.message ??
          "Telefon tasdiqlash so'rovi Telegram botga yuborildi",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Telegramga so'rov yuborib bo'lmadi",
      );
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
      const me = await authService.findMe();
      setMe(me);
      setSessionSource("phone");
      if (me.role !== "SUPER_ADMIN") {
        await captureDiscoveryLocation();
      }
      toast.success("Tizimga muvaffaqiyatli kirdingiz");
      navigate(returnTo && returnTo.startsWith("/mobile") ? returnTo : getRoleHomePath(me.role), { replace: true });
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.18),transparent_35%),linear-gradient(180deg,#fff8f8_0%,#fff4f5_55%,#ffffff_100%)]">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_460px] lg:px-10">
        <section className="hidden lg:block">
          <div className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Yaqin Market platformasi
          </div>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950">
            Eng yaqin do'konlardan order qiling yoki sellerlardan taklif oling.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Telefon raqamingiz bilan kirib, map orqali yaqin do'konlarni ko'ring,
            mahsulotlarni solishtiring va topa olmagan savatingizni broadcast qiling.
          </p>
          <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
            {[
              "Joylashuv bo'yicha discovery",
              "Store va product compare",
              "Broadcast so'rovlar",
              "Seller, courier va admin panellar",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 text-sm text-slate-700 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex flex-col items-center gap-4 text-center">
            <img src="/logo-web.png" alt="Yaqin Market" className="h-24 w-auto" />
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Kirish</h2>
              <p className="mt-2 text-sm text-slate-500">
                Telefon raqamingizni kiriting, tasdiqlash kodini yuboramiz
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {telegramCheckState.available && (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  {telegramCheckState.checking
                    ? "Telegram profilingiz tekshirilmoqda..."
                    : telegramCheckState.requiresPhoneVerification
                      ? "Telegram orqali kirish uchun telefonni tasdiqlash kerak"
                      : "Telegram mini-app tayyor"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {telegramCheckState.requiresPhoneVerification
                    ? telegramCheckState.telegramUser
                      ? `${telegramCheckState.telegramUser.first_name}, telefonni shu oynaning o'zidan yuborishingiz yoki bot orqali ulashingiz mumkin.`
                      : "Telefonni shu oynadan yuboring yoki bot orqali tasdiqlang."
                    : "Bog'langan Telegram profilingiz topildi."}
                </p>
                {telegramCheckState.requiresPhoneVerification &&
                  !telegramCheckState.checking && (
                    <Button
                      type="button"
                      className="mt-3 h-11 rounded-xl px-5"
                      onClick={handleTelegramPhoneRequest}
                    >
                      Telefon raqamni yuborish
                    </Button>
                  )}
              </div>
            )}

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
                className="h-12 w-full rounded-2xl text-sm font-semibold"
                onClick={handleSubmit}
                disabled={state.status === "loading"}
              >
                {state.status === "loading"
                  ? "Yuborilmoqda..."
                  : "SMS kod yuborish"}
              </Button>
            ) : (
              <Button
                className="h-12 w-full rounded-2xl text-sm font-semibold"
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
