// Sentry serveur : actif uniquement en production
import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://881011a6116d3646dae2d2ee5de63ecb@o4511914518118400.ingest.de.sentry.io/4511914547282000",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.2, // 20% par defaut ; ajustable sans redeploiement via env var
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
  });
}