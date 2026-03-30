import { useEffect } from "react";

function toPixelValue(value: number | undefined) {
  return typeof value === "number" ? `${value}px` : "0px";
}

function applyInsetVariables(webApp: TelegramWebApp) {
  const root = document.documentElement;
  const safeArea = webApp.safeAreaInset;
  const contentSafeArea = webApp.contentSafeAreaInset;

  root.style.setProperty("--tg-safe-top", toPixelValue(safeArea?.top));
  root.style.setProperty("--tg-safe-right", toPixelValue(safeArea?.right));
  root.style.setProperty("--tg-safe-bottom", toPixelValue(safeArea?.bottom));
  root.style.setProperty("--tg-safe-left", toPixelValue(safeArea?.left));

  root.style.setProperty(
    "--tg-content-safe-top",
    toPixelValue(contentSafeArea?.top ?? safeArea?.top),
  );
  root.style.setProperty(
    "--tg-content-safe-right",
    toPixelValue(contentSafeArea?.right ?? safeArea?.right),
  );
  root.style.setProperty(
    "--tg-content-safe-bottom",
    toPixelValue(contentSafeArea?.bottom ?? safeArea?.bottom),
  );
  root.style.setProperty(
    "--tg-content-safe-left",
    toPixelValue(contentSafeArea?.left ?? safeArea?.left),
  );
}

function applyTelegramChromeColors(webApp: TelegramWebApp) {
  const theme = webApp.themeParams;
  const backgroundColor = theme?.bg_color ?? theme?.secondary_bg_color;
  const headerColor =
    theme?.header_bg_color ?? theme?.bg_color ?? theme?.secondary_bg_color;

  if (backgroundColor) {
    webApp.setBackgroundColor?.(backgroundColor);
    document.documentElement.style.setProperty(
      "--tg-theme-bg-color",
      backgroundColor,
    );
  }

  if (headerColor) {
    webApp.setHeaderColor?.(headerColor);
    document.documentElement.style.setProperty(
      "--tg-theme-header-color",
      headerColor,
    );
  }

  if (theme?.text_color) {
    document.documentElement.style.setProperty(
      "--tg-theme-text-color",
      theme.text_color,
    );
  }

  if (webApp.colorScheme) {
    document.documentElement.style.colorScheme = webApp.colorScheme;
  }
}

export function useTelegramMiniApp() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initData) {
      return;
    }

    document.documentElement.classList.add("telegram-mini-app");
    document.body.classList.add("telegram-mini-app");

    const applyPresentation = () => {
      applyInsetVariables(webApp);
      applyTelegramChromeColors(webApp);
    };

    const handleFullscreenFailed = () => {
      webApp.expand?.();
    };

    applyPresentation();

    try {
      webApp.ready?.();
      webApp.expand?.();
      webApp.disableVerticalSwipes?.();
      if (!webApp.isFullscreen) {
        webApp.requestFullscreen?.();
      }
    } catch (error) {
      console.warn("Telegram Mini App init failed", error);
    }

    webApp.onEvent?.("themeChanged", applyPresentation);
    webApp.onEvent?.("safeAreaChanged", applyPresentation);
    webApp.onEvent?.("contentSafeAreaChanged", applyPresentation);
    webApp.onEvent?.("fullscreenFailed", handleFullscreenFailed);

    return () => {
      webApp.offEvent?.("themeChanged", applyPresentation);
      webApp.offEvent?.("safeAreaChanged", applyPresentation);
      webApp.offEvent?.("contentSafeAreaChanged", applyPresentation);
      webApp.offEvent?.("fullscreenFailed", handleFullscreenFailed);
    };
  }, []);
}
