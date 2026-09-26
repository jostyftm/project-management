export type EnvironmentType = "development" | "production";
export const WEB_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
export const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_ROUTE || "http://localhost:3000";
export const APP_DOC_URL = process.env.NEXT_PUBLIC_SDI_APP_DOC_URL || "";
export const REPORT_API_URL = process.env.NEXT_PUBLIC_REPORT_API_URL || "http://localhost:8001";
export const ENVIRONMENT: EnvironmentType = (process.env.NEXT_PUBLIC_ENVIRONMENT as EnvironmentType) || "development";

export const API_URL = (service: string, version: string) => {
  return (`${WEB_URL}/${service}/api/${version}`)
};

export const API_BASE_URL = `${WEB_URL}/api/v1`;
