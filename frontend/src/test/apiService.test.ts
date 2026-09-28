import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getApiBaseUrl } from "../services/api";

describe("getApiBaseUrl routing behavior", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should default to http://localhost:8000/api/v1 in development/test when NEXT_PUBLIC_API_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = "test";
    expect(getApiBaseUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("should default to same-origin /api/v1 in production when NEXT_PUBLIC_API_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NODE_ENV = "production";
    expect(getApiBaseUrl()).toBe("/api/v1");
  });

  it("should use explicitly configured NEXT_PUBLIC_API_URL and strip trailing slashes", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://custom-gateway.meshiq.com/api/v1/";
    expect(getApiBaseUrl()).toBe("https://custom-gateway.meshiq.com/api/v1");
  });

  it("should support relative custom path via NEXT_PUBLIC_API_URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "/custom-api/v1";
    expect(getApiBaseUrl()).toBe("/custom-api/v1");
  });

  it("should fallback to production default if NEXT_PUBLIC_API_URL is whitespace only", () => {
    process.env.NEXT_PUBLIC_API_URL = "   ";
    process.env.NODE_ENV = "production";
    expect(getApiBaseUrl()).toBe("/api/v1");
  });
});
