export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramWebAppSessionResponse {
  success: boolean;
  linked: boolean;
  requires_phone_verification: boolean;
  access_token?: string;
  user?: {
    id?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  telegram_user?: TelegramWebAppUser;
}
