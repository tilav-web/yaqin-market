export type AuthStatus = "idle" | "loading" | "success" | "error";

export type AuthState = {
  phone: string;
  status: AuthStatus;
  errorMessage: string;
  otpLength: 4 | 6;
  otp: string[];
};
