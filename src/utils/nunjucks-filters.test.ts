import { describe, expect, it } from "vite-plus/test";
import { formatDate } from "./nunjucks-filters";
import { formatEnergySources } from "./nunjucks-filters";

describe("nunjucksFilters", () => {
  describe("formatDate", () => {
    it("formats a date with the correct ordinal suffix", () => {
      expect(formatDate("2026-10-28")).toBe("28th October 2026");
    });

    it("formats dates with st, nd and rd suffixes", () => {
      expect(formatDate("2026-10-01")).toBe("1st October 2026");
      expect(formatDate("2026-10-02")).toBe("2nd October 2026");
      expect(formatDate("2026-10-03")).toBe("3rd October 2026");
    });

    it("uses th for dates between 11 and 13", () => {
      expect(formatDate("2026-10-11")).toBe("11th October 2026");
      expect(formatDate("2026-10-12")).toBe("12th October 2026");
      expect(formatDate("2026-10-13")).toBe("13th October 2026");
    });

    it("formats the twenty-first day correctly", () => {
      expect(formatDate("2026-10-21")).toBe("21st October 2026");
    });

    it("returns an empty string when the date is undefined", () => {
      expect(formatDate(undefined)).toBe("");
    });

    it("returns the original string when the date is invalid", () => {
      expect(formatDate("not-a-date")).toBe("not-a-date");
    });
  });

  describe("formatEnergySources", () => {
    it("formats a single energy source", () => {
      expect(formatEnergySources(["mains_gas"])).toBe("Mains gas");
    });

    it("joins two energy sources with and", () => {
      expect(formatEnergySources(["mains_gas", "electricity"])).toBe("Mains gas and electricity");
    });

    it("separates more than two energy sources with commas and and", () => {
      expect(formatEnergySources(["mains_gas", "electricity", "LPG_bulk"])).toBe(
        "Mains gas, electricity and LPG bulk",
      );
    });

    it("formats all supported energy sources", () => {
      expect(
        formatEnergySources([
          "mains_gas",
          "electricity",
          "LPG_bulk",
          "LPG_bottled",
          "LPG_condition_11F",
        ]),
      ).toBe("Mains gas, electricity, LPG bulk, LPG bottled and LPG condition 11F");
    });

    it("returns an empty string when there are no energy sources", () => {
      expect(formatEnergySources([])).toBe("");
    });

    it("returns an empty string when energy sources are undefined", () => {
      expect(formatEnergySources(undefined)).toBe("");
    });
  });
});
