// Sentry serveur : actif uniquement en production
import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://881011a6116d3646dae2d2ee5de63ecb@o4511914518118400.ingest.de.sentry.io/4511914547282000",
    tracesSampleRate: 1,
  });
}