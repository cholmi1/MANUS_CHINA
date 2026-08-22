export const NETLIFY_PROXY_ERROR_EVENT = "field-ledger:api-proxy-error";

export type ApiProxyIssue = {
  status?: number;
  message?: string;
};

export class LoginConfigurationError extends Error {
  constructor(public readonly missingKeys: string[]) {
    super(`로그인 설정이 완료되지 않았습니다. Netlify 환경 변수에 ${missingKeys.join(", ")} 값을 추가한 뒤 재배포해 주세요.`);
    this.name = "LoginConfigurationError";
  }
}

export function getMissingOauthEnvironment(oauthPortalUrl?: string, appId?: string): string[] {
  const missing: string[] = [];
  if (!oauthPortalUrl?.trim()) missing.push("VITE_OAUTH_PORTAL_URL");
  if (!appId?.trim()) missing.push("VITE_APP_ID");
  return missing;
}

export function isNetlifyApiProxyFailure(issue: ApiProxyIssue): boolean {
  if (issue.status === 404 || issue.status === 502 || issue.status === 503 || issue.status === 504) return true;
  return /failed to fetch|networkerror|load failed|unexpected token.*</i.test(issue.message ?? "");
}

let lastProxyNoticeAt = 0;

export function emitNetlifyApiProxyIssue(issue: ApiProxyIssue) {
  if (typeof window === "undefined" || !isNetlifyApiProxyFailure(issue)) return;
  const now = Date.now();
  if (now - lastProxyNoticeAt < 1500) return;
  lastProxyNoticeAt = now;
  window.dispatchEvent(new CustomEvent<ApiProxyIssue>(NETLIFY_PROXY_ERROR_EVENT, { detail: issue }));
}
