export const AUTH_ANALYTICS_EVENTS = {
  openSignup: "auth_open_signup",
  completeSignupStep1: "auth_complete_signup_step1",
  submitSignup: "auth_submit_signup",
  signupSuccess: "auth_signup_success",
  signupFailure: "auth_signup_failure",
  openLogin: "auth_open_login",
  submitLogin: "auth_submit_login",
  loginSuccess: "auth_login_success",
  loginFailure: "auth_login_failure",
  clickUnavailableSso: "auth_click_unavailable_sso",
} as const;

export type AuthAnalyticsEventName = (typeof AUTH_ANALYTICS_EVENTS)[keyof typeof AUTH_ANALYTICS_EVENTS];
