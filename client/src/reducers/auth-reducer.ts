import type { AuthState, AuthStatus } from "@/types/auth.type";

export type AuthAction =
  | { type: "PHONE_CHANGE"; payload: { phone: string } }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; payload: { otpLength: 4 | 6 } }
  | { type: "SUBMIT_ERROR"; payload: { message: string } }
  | { type: "SET_OTP"; payload: { otp: string[] } };

export const initialAuthState: AuthState = {
  phone: "",
  status: "idle",
  errorMessage: "",
  otpLength: 6,
  otp: Array(6).fill(""),
};

export const authActions = {
  phoneChange: (phone: string): AuthAction => ({
    type: "PHONE_CHANGE",
    payload: { phone },
  }),
  submitStart: (): AuthAction => ({ type: "SUBMIT_START" }),
  submitSuccess: (otpLength: 4 | 6): AuthAction => ({
    type: "SUBMIT_SUCCESS",
    payload: { otpLength },
  }),
  submitError: (message: string): AuthAction => ({
    type: "SUBMIT_ERROR",
    payload: { message },
  }),
  setOtp: (otp: string[]): AuthAction => ({
    type: "SET_OTP",
    payload: { otp },
  }),
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "PHONE_CHANGE": {
      const nextPhone = action.payload.phone;
      const shouldReset = state.status === "success";
      return {
        ...state,
        phone: nextPhone,
        errorMessage: "",
        status: shouldReset ? "idle" : state.status,
        otpLength: shouldReset ? initialAuthState.otpLength : state.otpLength,
        otp: shouldReset ? Array(initialAuthState.otpLength).fill("") : state.otp,
      };
    }
    case "SUBMIT_START":
      return { ...state, status: "loading", errorMessage: "" };
    case "SUBMIT_SUCCESS": {
      const length = action.payload.otpLength;
      return {
        ...state,
        status: "success",
        errorMessage: "",
        otpLength: length,
        otp: Array(length).fill(""),
      };
    }
    case "SUBMIT_ERROR":
      return { ...state, status: "error", errorMessage: action.payload.message };
    case "SET_OTP":
      return { ...state, otp: action.payload.otp };
    default:
      return state;
  }
}
