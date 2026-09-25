import { describe, it, expect } from "vitest";
import { QUESTIONS, SECTIONS } from "../data/questionCatalog";

describe("Authoritative Question Catalog (Q01-Q22)", () => {
  it("contains all 7 authoritative sections in order (A through G)", () => {
    expect(SECTIONS).toHaveLength(7);
    expect(SECTIONS.map((s) => s.id)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });

  it("maps exactly 22 unique questions across the 7 sections", () => {
    const allMappedQuestionIds = SECTIONS.flatMap((s) => s.questionIds);
    expect(allMappedQuestionIds).toHaveLength(22);
    expect(new Set(allMappedQuestionIds).size).toBe(22);

    for (let i = 1; i <= 22; i++) {
      const qCode = `Q${String(i).padStart(2, "0")}`;
      expect(QUESTIONS[qCode]).toBeDefined();
      expect(QUESTIONS[qCode].number).toBe(i);
    }
  });

  it("verifies Section A contains Q01 to Q05", () => {
    const secA = SECTIONS.find((s) => s.id === "A");
    expect(secA?.questionIds).toEqual(["Q01", "Q02", "Q03", "Q04", "Q05"]);
  });

  it("verifies Section B contains Q06 to Q08", () => {
    const secB = SECTIONS.find((s) => s.id === "B");
    expect(secB?.questionIds).toEqual(["Q06", "Q07", "Q08"]);
  });

  it("verifies Section C contains Q09 to Q11", () => {
    const secC = SECTIONS.find((s) => s.id === "C");
    expect(secC?.questionIds).toEqual(["Q09", "Q10", "Q11"]);
  });

  it("verifies Section D contains Q12 to Q15", () => {
    const secD = SECTIONS.find((s) => s.id === "D");
    expect(secD?.questionIds).toEqual(["Q12", "Q13", "Q14", "Q15"]);
  });

  it("verifies Section E contains Q16 to Q17", () => {
    const secE = SECTIONS.find((s) => s.id === "E");
    expect(secE?.questionIds).toEqual(["Q16", "Q17"]);
  });

  it("verifies Section F contains Q18 to Q19", () => {
    const secF = SECTIONS.find((s) => s.id === "F");
    expect(secF?.questionIds).toEqual(["Q18", "Q19"]);
  });

  it("verifies Section G contains Q20 to Q22", () => {
    const secG = SECTIONS.find((s) => s.id === "G");
    expect(secG?.questionIds).toEqual(["Q20", "Q21", "Q22"]);
  });

  it("flags authoritative calculation feeder questions", () => {
    expect(QUESTIONS.Q04.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q06.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q07.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q12.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q14.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q15.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q20.feedsCalculation).toBe(true);

    // Qualitative/Contextual questions do not feed arithmetic multipliers directly
    expect(QUESTIONS.Q08.feedsCalculation).toBe(false);
    expect(QUESTIONS.Q11.feedsCalculation).toBe(false);
    expect(QUESTIONS.Q18.feedsCalculation).toBe(false);
    expect(QUESTIONS.Q19.feedsCalculation).toBe(false);
    expect(QUESTIONS.Q21.feedsCalculation).toBe(false);
  });
});
