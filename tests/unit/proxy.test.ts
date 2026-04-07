import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

describe("proxy", () => {
  it("redirects unauthenticated users away from protected routes", () => {
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = proxy(request);

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("allows authenticated users to access protected routes", () => {
    const request = new NextRequest("http://localhost:3000/dashboard", {
      headers: {
        cookie: "health_tracker_session=token",
      },
    });
    const response = proxy(request);

    expect(response?.status).toBe(200);
  });

  it("redirects authenticated users away from auth routes", () => {
    const request = new NextRequest("http://localhost:3000/login", {
      headers: {
        cookie: "health_tracker_session=token",
      },
    });
    const response = proxy(request);

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });
});
