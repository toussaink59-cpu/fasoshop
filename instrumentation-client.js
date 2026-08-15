// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://881011a6116d3646dae2d2ee5de63ecb@o4511914518118400.ingest.de.sentry.io/4511914547282000",

  // Replay : activé UNIQUEMENT sur erreur (économie de quota)
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1,
  enableLogs: true,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Ignore les erreurs "bruit de fond" non pertinentes
  ignoreErrors: [
    "ResizeObserver loop",
    "NetworkError",
    "Failed to fetch",
    "ChunkLoadError",
    "Loading chunk",
    "AbortError",
    "Non-Error promise rejection",
    "myUndefinedFunction", // ignore le test manuel
  ],

  dataCollection: {
    // userInfo: false,
    // httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;