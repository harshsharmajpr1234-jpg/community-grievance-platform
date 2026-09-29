import { describe, expect, it } from "vitest";
import {
  adminComplaintActionSchema,
  createComplaintSchema,
  forgotPasswordSchema,
  loginSchema,
  mobileSchema,
  registerSchema,
  resetPasswordSchema,
  trackComplaintSchema,
} from "@/shared/validation";

const uuid = "11111111-2222-4333-8444-555555555555";
const strong = "Str0ngPassw0rd!";

describe("mobile validation", () => {
  it("accepts Indian mobiles and normalises prefixes", () => {
    expect(mobileSchema.parse("9876543210")).toBe("9876543210");
    expect(mobileSchema.parse("+91 98765 43210")).toBe("9876543210");
    expect(mobileSchema.parse("09876543210")).toBe("9876543210");
  });
  it("strips all non-digits exactly like login normalization", () => {
    expect(mobileSchema.parse("+91 (98765) 43210")).toBe("9876543210");
    expect(mobileSchema.parse("+91-98765-43210")).toBe("9876543210");
  });
  it("rejects invalid numbers", () => {
    expect(() => mobileSchema.parse("12345")).toThrow();
    expect(() => mobileSchema.parse("1234567890")).toThrow();
  });
});

describe("registration input", () => {
  const base = {
    name: "Test Resident",
    mobile: "9876543210",
    password: strong,
    confirmPassword: strong,
    ward: "Ward 12",
    acceptTerms: true as const,
  };
  it("accepts a complete registration", () => {
    const parsed = registerSchema.parse(base);
    expect(parsed.mobile).toBe("9876543210");
    expect(parsed.ward).toBe("Ward 12");
    expect(parsed.email).toBeUndefined();
  });
  it("canonicalizes ward strings 12, 13, 14", () => {
    expect(registerSchema.parse({ ...base, ward: "12" }).ward).toBe("Ward 12");
    expect(registerSchema.parse({ ...base, ward: "13" }).ward).toBe("Ward 13");
    expect(registerSchema.parse({ ...base, ward: "14" }).ward).toBe("Ward 14");
    expect(registerSchema.parse({ ...base, ward: "वार्ड 12" }).ward).toBe("Ward 12");
  });
  it("lowercases the email so login lookup always matches", () => {
    expect(registerSchema.parse({ ...base, email: "Test@Example.com" }).email).toBe("test@example.com");
    expect(registerSchema.parse({ ...base, email: "  USER@Example.COM " }).email).toBe("user@example.com");
  });
  it("rejects mismatched or weak passwords and missing terms or invalid ward", () => {
    expect(() => registerSchema.parse({ ...base, confirmPassword: "other" })).toThrow(/do not match/);
    expect(() => registerSchema.parse({ ...base, password: "123", confirmPassword: "123" })).toThrow();
    expect(() => registerSchema.parse({ ...base, acceptTerms: false })).toThrow();
    expect(() => registerSchema.parse({ ...base, ward: "" })).toThrow();
    expect(() => registerSchema.parse({ ...base, ward: "Ward 99" })).toThrow();
  });
});

describe("login input", () => {
  it("accepts mobile or email identifiers", () => {
    expect(loginSchema.parse({ identifier: "9876543210", password: "x" }).identifier).toBe("9876543210");
    expect(loginSchema.parse({ identifier: "User@Example.com", password: "x" }).identifier).toBe("User@Example.com");
  });
  it("rejects empty credentials", () => {
    expect(() => loginSchema.parse({ identifier: "", password: "x" })).toThrow();
    expect(() => loginSchema.parse({ identifier: "9876543210", password: "" })).toThrow();
  });
});

describe("password reset input", () => {
  it("normalises the reset email", () => {
    expect(forgotPasswordSchema.parse({ email: "User@Example.com" }).email).toBe("user@example.com");
    expect(() => forgotPasswordSchema.parse({ email: "not-an-email" })).toThrow();
  });
  it("requires matching strong passwords", () => {
    const token = "a".repeat(64);
    expect(resetPasswordSchema.parse({ token, newPassword: strong, confirmPassword: strong }).token).toBe(token);
    expect(() => resetPasswordSchema.parse({ token, newPassword: strong, confirmPassword: "other" })).toThrow();
    expect(() => resetPasswordSchema.parse({ token, newPassword: "123", confirmPassword: "123" })).toThrow();
    expect(() => resetPasswordSchema.parse({ token: "short", newPassword: strong, confirmPassword: strong })).toThrow();
  });
});

describe("complaint creation", () => {
  it("validates required fields and defaults", () => {
    const parsed = createComplaintSchema.parse({ categoryId: uuid, title: "Street light broken", description: "The light near the crossing has not worked for a week.", address: "House No 25, Benad Road", wardNumber: "12", manualAreaName: "Benad Road" });
    expect(parsed.priority).toBe("MEDIUM");
    expect(parsed.contactPreference).toBe("SMS");
    expect(parsed.wardNumber).toBe("12");
  });
  it("accepts Ward 12, Ward 13 and Ward 14, rejects Ward 11 and invalid strings", () => {
    expect(createComplaintSchema.parse({ categoryId: uuid, title: "Valid title here", description: "The light near the crossing has not worked for a week.", address: "House No 25", wardNumber: "12", manualAreaName: "Benad Road" }).wardNumber).toBe("12");
    expect(createComplaintSchema.parse({ categoryId: uuid, title: "Valid title here", description: "The light near the crossing has not worked for a week.", address: "House No 25", wardNumber: "Ward 13", manualAreaName: "Benad Road" }).wardNumber).toBe("13");
    expect(createComplaintSchema.parse({ categoryId: uuid, title: "Valid title here", description: "The light near the crossing has not worked for a week.", address: "House No 25", wardNumber: "Ward 14", manualAreaName: "Benad Road" }).wardNumber).toBe("14");
    expect(() => createComplaintSchema.parse({ categoryId: uuid, title: "Valid title here", description: "The light near the crossing has not worked for a week.", address: "House No 25", wardNumber: "11", manualAreaName: "Benad Road" })).toThrow();
    expect(() => createComplaintSchema.parse({ categoryId: uuid, title: "Valid title here", description: "The light near the crossing has not worked for a week.", address: "House No 25", wardNumber: "All Jaipur", manualAreaName: "Benad Road" })).toThrow();
  });
  it("rejects short titles/descriptions and bad coordinates", () => {
    expect(() => createComplaintSchema.parse({ categoryId: uuid, title: "Hi", description: "x".repeat(30), address: "Valid address" })).toThrow();
    expect(() => createComplaintSchema.parse({ categoryId: uuid, title: "Valid title", description: "short", address: "Valid address" })).toThrow();
    expect(() => createComplaintSchema.parse({ categoryId: uuid, title: "Valid title", description: "x".repeat(30), address: "Valid address", latitude: 200 })).toThrow();
  });
});

describe("tracking", () => {
  it("normalises complaint code", () => {
    expect(trackComplaintSchema.parse({ code: " dpf-2026-000001 ", mobile: "9876543210" }).code).toBe("DPF-2026-000001");
    expect(() => trackComplaintSchema.parse({ code: "ABC-1", mobile: "9876543210" })).toThrow();
  });
});

describe("admin actions", () => {
  it("accepts discriminated actions", () => {
    expect(adminComplaintActionSchema.parse({ action: "STATUS", status: "IN_PROGRESS" }).action).toBe("STATUS");
    expect(adminComplaintActionSchema.parse({ action: "DUPLICATE", duplicateOfCode: "dpf-2026-000002" })).toMatchObject({ duplicateOfCode: "DPF-2026-000002" });
  });
  it("rejects unknown actions and missing fields", () => {
    expect(() => adminComplaintActionSchema.parse({ action: "DELETE" })).toThrow();
    expect(() => adminComplaintActionSchema.parse({ action: "FORWARD" })).toThrow();
  });
});

describe("master production cross-check verification", () => {
  it("enforces Ward 12, Ward 13 and Ward 14 in complaint schema", () => {
    expect(createComplaintSchema.parse({
      categoryId: uuid,
      title: "Water pipeline leakage issue",
      description: "Water has been overflowing near Benad road crossing for 2 days.",
      address: "House No 45, Main Benad Road",
      wardNumber: "12",
      manualAreaName: "Dadi Ka Phatak",
    }).wardNumber).toBe("12");

    expect(createComplaintSchema.parse({
      categoryId: uuid,
      title: "Street light maintenance required",
      description: "Street light pole #4 is dark since Monday.",
      address: "Lane No 3, Shiv Nagar",
      wardNumber: "Ward 13",
      manualAreaName: "Shiv Nagar Colony",
    }).wardNumber).toBe("13");

    expect(createComplaintSchema.parse({
      categoryId: uuid,
      title: "Drainage cleaning required",
      description: "Drain blockage in Ward 14 main market area.",
      address: "Main Market, Ward 14",
      wardNumber: "Ward 14",
      manualAreaName: "Ward 14 Market",
    }).wardNumber).toBe("14");

    expect(() => createComplaintSchema.parse({ categoryId: uuid, title: "Valid Title", description: "Valid Description", address: "Valid address", wardNumber: "11", manualAreaName: "Area" })).toThrow();
    expect(() => createComplaintSchema.parse({ categoryId: uuid, title: "Valid Title", description: "Valid Description", address: "Valid address", wardNumber: "All Jaipur", manualAreaName: "Area" })).toThrow();
  });

  it("enforces free-text location fields", () => {
    const parsed = createComplaintSchema.parse({
      categoryId: uuid,
      title: "Road repair required",
      description: "Potholes near Dadi Ka Phatak railway crossing need urgent repair.",
      wardNumber: "12",
      manualAreaName: "Custom Locality Name Here",
      address: "House No. 99, Custom Lane, Custom Colony",
      landmark: "Custom Landmark Text Near Water Tank",
    });
    expect(parsed.manualAreaName).toBe("Custom Locality Name Here");
    expect(parsed.address).toBe("House No. 99, Custom Lane, Custom Colony");
    expect(parsed.landmark).toBe("Custom Landmark Text Near Water Tank");
  });

  it("accepts registration with simple minimum 4-char password", () => {
    const reg = registerSchema.parse({
      name: "Test Citizen",
      mobile: "9876543210",
      password: "pass",
      confirmPassword: "pass",
      ward: "Ward 12",
      acceptTerms: true,
    });
    expect(reg.password).toBe("pass");
    expect(reg.mobile).toBe("9876543210");
    expect(reg.ward).toBe("Ward 12");
  });

  it("accepts login with mobile or email", () => {
    expect(loginSchema.parse({ identifier: "9876543210", password: "pass" }).identifier).toBe("9876543210");
    expect(loginSchema.parse({ identifier: "User@Example.com", password: "pass" }).identifier).toBe("User@Example.com");
  });
});
