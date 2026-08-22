import { describe, expect, it } from "vitest";
import { getMissingOauthEnvironment, isNetlifyApiProxyFailure } from "./runtimeNotices";

describe("runtime notices", () => {
  it("identifies each required public OAuth variable before login redirect", () => {
    expect(getMissingOauthEnvironment(undefined, undefined)).toEqual(["VITE_OAUTH_PORTAL_URL", "VITE_APP_ID"]);
    expect(getMissingOauthEnvironment("https://oauth.example", "app-123")).toEqual([]);
  });

  it("recognizes Netlify proxy status and network failures without treating ordinary validation errors as outages", () => {
    expect(isNetlifyApiProxyFailure({ status: 404 })).toBe(true);
    expect(isNetlifyApiProxyFailure({ status: 502 })).toBe(true);
    expect(isNetlifyApiProxyFailure({ message: "Failed to fetch" })).toBe(true);
    expect(isNetlifyApiProxyFailure({ status: 400, message: "입력값을 확인해 주세요." })).toBe(false);
  });
});
