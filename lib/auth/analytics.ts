import { AUTH_ANALYTICS_EVENTS, type AuthAnalyticsEventName } from "@/lib/auth/analytics.constants";

type AuthAnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

type AuthAnalyticsDetail = {
  event: AuthAnalyticsEventName;
  payload?: AuthAnalyticsPayload;
  at: string;
};

const AUTH_ANALYTICS_WINDOW_EVENT = "auth:analytics";

export function trackAuthEvent(event: AuthAnalyticsEventName, payload?: AuthAnalyticsPayload) {
  try {
    if (typeof window === "undefined") return;

    const detail: AuthAnalyticsDetail = {
      event,
      payload,
      at: new Date().toISOString(),
    };

    window.dispatchEvent(new CustomEvent<AuthAnalyticsDetail>(AUTH_ANALYTICS_WINDOW_EVENT, { detail }));

    if (process.env.NODE_ENV !== "production") {
      console.info("[AuthAnalytics]", detail);
    }
  } catch {
    // Analytics must never break auth journeys.
  }
}

export { AUTH_ANALYTICS_EVENTS };
