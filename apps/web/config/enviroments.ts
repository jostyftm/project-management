export type EnvironmentType = "development" | "production";

// When NEXT_PUBLIC_API_URL is unset or empty, use same-origin relative paths ("")
// If an explicit URL is provided (e.g., during standalone or cross-origin setups), strip trailing slash.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
export const WEB_URL = rawApiUrl ? rawApiUrl.replace(/\/+$/, "") : "";

export const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_ROUTE || "";
export const APP_DOC_URL = process.env.NEXT_PUBLIC_SDI_APP_DOC_URL || "";
export const REPORT_API_URL = process.env.NEXT_PUBLIC_REPORT_API_URL || "";
export const ENVIRONMENT: EnvironmentType = (process.env.NEXT_PUBLIC_ENVIRONMENT as EnvironmentType) || "development";

export const API_URL = (service: string, version: string) => {
  return `${WEB_URL}/${service}/api/${version}`;
};

export const API_BASE_URL = `${WEB_URL}/api/v1`;
