import { describe, expect, it } from "vitest";
import { gmtLabel, zonedTime } from "./events";

describe("zonedTime", () => {
  it("handles Kazakhstan (UTC+5)", () => {
    expect(new Date(zonedTime("2026-11-28", "Asia/Qyzylorda")).toISOString()).toBe("2026-11-28T04:00:00.000Z");
  });
  it("handles US Central in winter (UTC-6)", () => {
    expect(new Date(zonedTime("2026-11-21", "America/Chicago")).toISOString()).toBe("2026-11-21T15:00:00.000Z");
  });
  it("handles US Central after DST starts (UTC-5)", () => {
    expect(new Date(zonedTime("2027-04-28", "America/Chicago")).toISOString()).toBe("2027-04-28T14:00:00.000Z");
  });
  it("labels offsets", () => {
    expect(gmtLabel(zonedTime("2027-01-10", "America/St_Johns"), "America/St_Johns")).toBe("GMT-3:30");
  });
});
