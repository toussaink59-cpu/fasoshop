// Sentry ACTIF UNIQUEMENT EN PRODUCTION.
// En dev : pas de tunnel /monitoring, pas de latence, console propre.
import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://881011a6116d3646dae2d2ee5de63ecb@o4511914518118400.ingest.de.sentry.io/4511914547282000",
    tracesSampleRate: 1,
    enableLogs: true,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
    ignoreErrors: [
      "ResizeObserver loop",
      "NetworkError",
      "Failed to fetch",
      "ChunkLoadError",
      "Loading chunk",
      "AbortError",
      "Non-Error promise rejection",
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;