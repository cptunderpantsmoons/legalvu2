import { describe, it, expect, vi } from "vitest";
import {
  ok,
  fail,
  wrapError,
  asyncWrapError,
  sendToRenderer,
  getCurrentUserId,
} from "./types";
import type { IpcDeps } from "./types";

// Mock electron so importing the module doesn't crash
vi.mock("electron", () => ({
  BrowserWindow: class {},
  app: { getPath: () => "/tmp" },
}));

// Mock auth-service so getCurrentUserId doesn't crash without a DB
vi.mock("../services/auth-service", () => ({
  requireAuth: vi.fn(() => {
    throw new Error("Authentication required. Please log in.");
  }),
  default: {
    requireAuth: vi.fn(() => {
      throw new Error("Authentication required. Please log in.");
    }),
  },
}));

describe("ipc/types result helpers", () => {
  describe("ok", () => {
    it("wraps a value in a success Result", () => {
      const result = ok("hello");
      expect(result).toEqual({ ok: true, data: "hello" });
    });

    it("wraps objects", () => {
      const result = ok({ id: 1, name: "test" });
      expect(result).toEqual({ ok: true, data: { id: 1, name: "test" } });
    });

    it("wraps null", () => {
      const result = ok(null);
      expect(result).toEqual({ ok: true, data: null });
    });
  });

  describe("fail", () => {
    it("wraps an error string in a failure Result", () => {
      const result = fail("something went wrong");
      expect(result).toEqual({ ok: false, error: "something went wrong" });
    });
  });

  describe("wrapError", () => {
    it("returns ok(data) when fn succeeds", () => {
      const result = wrapError(() => 42);
      expect(result).toEqual({ ok: true, data: 42 });
    });

    it("returns fail(error.message) when fn throws", () => {
      const result = wrapError(() => {
        throw new Error("boom");
      });
      expect(result).toEqual({ ok: false, error: "boom" });
    });

    it("returns fail with undefined error for non-Error throws", () => {
      // The implementation casts to Error and reads .message, which is undefined
      // for non-Error throws. This documents the current behavior.
      const result = wrapError(() => {
        throw "string error";
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeUndefined();
      }
    });
  });

  describe("asyncWrapError", () => {
    it("returns ok(data) when async fn succeeds", async () => {
      const result = await asyncWrapError(async () => "value");
      expect(result).toEqual({ ok: true, data: "value" });
    });

    it("returns fail(error.message) when async fn rejects", async () => {
      const result = await asyncWrapError(async () => {
        throw new Error("async boom");
      });
      expect(result).toEqual({ ok: false, error: "async boom" });
    });

    it("returns fail with undefined error for non-Error rejection", async () => {
      const result = await asyncWrapError(async () => {
        throw 42;
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeUndefined();
      }
    });
  });
});

describe("sendToRenderer", () => {
  it("sends a message when window exists and is not destroyed", () => {
    const send = vi.fn();
    const deps: IpcDeps = {
      getMainWindow: () =>
        ({
          webContents: { send },
          isDestroyed: () => false,
        }) as unknown as import("electron").BrowserWindow,
      getActiveStreamController: () => null,
      setActiveStreamController: () => {},
    };
    sendToRenderer(deps, "test-channel", "arg1", 42);
    expect(send).toHaveBeenCalledWith("test-channel", "arg1", 42);
  });

  it("does nothing when window is null", () => {
    const deps: IpcDeps = {
      getMainWindow: () => null,
      getActiveStreamController: () => null,
      setActiveStreamController: () => {},
    };
    expect(() => sendToRenderer(deps, "test-channel", "data")).not.toThrow();
  });

  it("does nothing when window is destroyed", () => {
    const send = vi.fn();
    const deps: IpcDeps = {
      getMainWindow: () =>
        ({
          webContents: { send },
          isDestroyed: () => true,
        }) as unknown as import("electron").BrowserWindow,
      getActiveStreamController: () => null,
      setActiveStreamController: () => {},
    };
    sendToRenderer(deps, "test-channel", "data");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("getCurrentUserId", () => {
  it("throws when not authenticated", () => {
    expect(() => getCurrentUserId()).toThrow("Authentication required");
  });
});
