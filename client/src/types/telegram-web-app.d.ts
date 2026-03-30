declare global {
  type TelegramWebAppColorScheme = "light" | "dark";

  interface TelegramWebAppThemeParams {
    bg_color?: string;
    secondary_bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    header_bg_color?: string;
    accent_text_color?: string;
    section_bg_color?: string;
    section_header_text_color?: string;
    subtitle_text_color?: string;
    destructive_text_color?: string;
    section_separator_color?: string;
    bottom_bar_bg_color?: string;
  }

  interface TelegramWebAppInsets {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  }

  type TelegramWebAppEvent =
    | "themeChanged"
    | "viewportChanged"
    | "fullscreenChanged"
    | "fullscreenFailed"
    | "safeAreaChanged"
    | "contentSafeAreaChanged"
    | "activated"
    | "deactivated";

  interface TelegramWebApp {
    initData?: string;
    version?: string;
    platform?: string;
    colorScheme?: TelegramWebAppColorScheme;
    themeParams?: TelegramWebAppThemeParams;
    isActive?: boolean;
    isExpanded?: boolean;
    isFullscreen?: boolean;
    safeAreaInset?: TelegramWebAppInsets;
    contentSafeAreaInset?: TelegramWebAppInsets;
    ready?: () => void;
    expand?: () => void;
    requestFullscreen?: () => void;
    exitFullscreen?: () => void;
    lockOrientation?: () => void;
    unlockOrientation?: () => void;
    setHeaderColor?: (color: string) => void;
    setBackgroundColor?: (color: string) => void;
    disableVerticalSwipes?: () => void;
    enableVerticalSwipes?: () => void;
    onEvent?: (
      eventType: TelegramWebAppEvent,
      handler: (payload?: unknown) => void,
    ) => void;
    offEvent?: (
      eventType: TelegramWebAppEvent,
      handler: (payload?: unknown) => void,
    ) => void;
  }

  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export {};
