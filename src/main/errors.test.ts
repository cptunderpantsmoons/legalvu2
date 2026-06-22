import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthError,
  ExternalServiceError,
} from "./errors";

describe("errors", () => {
  describe("AppError", () => {
    it("sets message and code", () => {
      const err = new AppError("something broke", "CUSTOM_CODE");
      expect(err.message).toBe("something broke");
      expect(err.code).toBe("CUSTOM_CODE");
    });

    it("sets name to constructor name", () => {
      const err = new AppError("msg", "CODE");
      expect(err.name).toBe("AppError");
    });

    it("extends Error", () => {
      const err = new AppError("msg", "CODE");
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe("ValidationError", () => {
    it("uses VALIDATION_ERROR code", () => {
      const err = new ValidationError("invalid input");
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.message).toBe("invalid input");
    });

    it("sets name to ValidationError", () => {
      const err = new ValidationError("msg");
      expect(err.name).toBe("ValidationError");
    });

    it("extends AppError", () => {
      const err = new ValidationError("msg");
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe("NotFoundError", () => {
    it("uses NOT_FOUND code", () => {
      const err = new NotFoundError("not found");
      expect(err.code).toBe("NOT_FOUND");
    });

    it("sets name to NotFoundError", () => {
      const err = new NotFoundError("msg");
      expect(err.name).toBe("NotFoundError");
    });
  });

  describe("AuthError", () => {
    it("uses AUTH_ERROR code", () => {
      const err = new AuthError("not authorized");
      expect(err.code).toBe("AUTH_ERROR");
    });

    it("sets name to AuthError", () => {
      const err = new AuthError("msg");
      expect(err.name).toBe("AuthError");
    });
  });

  describe("ExternalServiceError", () => {
    it("uses EXTERNAL_SERVICE_ERROR code", () => {
      const err = new ExternalServiceError("AI provider failed");
      expect(err.code).toBe("EXTERNAL_SERVICE_ERROR");
    });

    it("sets name to ExternalServiceError", () => {
      const err = new ExternalServiceError("msg");
      expect(err.name).toBe("ExternalServiceError");
    });
  });

  describe("error hierarchy", () => {
    it("all subclasses extend AppError", () => {
      expect(new ValidationError("x")).toBeInstanceOf(AppError);
      expect(new NotFoundError("x")).toBeInstanceOf(AppError);
      expect(new AuthError("x")).toBeInstanceOf(AppError);
      expect(new ExternalServiceError("x")).toBeInstanceOf(AppError);
    });

    it("all subclasses extend Error", () => {
      expect(new ValidationError("x")).toBeInstanceOf(Error);
      expect(new NotFoundError("x")).toBeInstanceOf(Error);
      expect(new AuthError("x")).toBeInstanceOf(Error);
      expect(new ExternalServiceError("x")).toBeInstanceOf(Error);
    });

    it("each subclass has a distinct code", () => {
      expect(new ValidationError("x").code).not.toBe(
        new NotFoundError("x").code,
      );
      expect(new NotFoundError("x").code).not.toBe(new AuthError("x").code);
      expect(new AuthError("x").code).not.toBe(
        new ExternalServiceError("x").code,
      );
    });
  });
});
