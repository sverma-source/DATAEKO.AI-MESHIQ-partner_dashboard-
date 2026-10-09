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

  it("verifies 'Not sure' availability adheres strictly to the question-by-question audit", () => {
    // Approved questions retaining 'Not sure' / unknown option
    const approvedNotSureQuestions = ["Q04", "Q05", "Q06", "Q07", "Q08", "Q09", "Q12", "Q13", "Q14", "Q15", "Q21"];

    // Questions where 'Not sure' is excluded / inappropriate
    const excludedNotSureQuestions = ["Q01", "Q02", "Q03", "Q10", "Q11", "Q16", "Q17", "Q18", "Q19", "Q20", "Q22"];

    expect(approvedNotSureQuestions.length + excludedNotSureQuestions.length).toBe(22);

    for (const qCode of approvedNotSureQuestions) {
      const q = QUESTIONS[qCode];
      const hasUnknownOrNotSureOption = q.options?.some((opt) => opt.isUnknownOrNotSure === true);
      expect(
        hasUnknownOrNotSureOption,
        `Expected ${qCode} to have an approved Not sure / Unknown option`
      ).toBe(true);
    }

    for (const qCode of excludedNotSureQuestions) {
      const q = QUESTIONS[qCode];
      const hasUnknownOrNotSureOption = q.options?.some((opt) => opt.isUnknownOrNotSure === true);
      expect(
        hasUnknownOrNotSureOption,
        `Expected ${qCode} NOT to offer a Not sure / Unknown option`
      ).toBe(false);
      const hasNotSureValue = q.options?.some((opt) => opt.value === "Not sure" || opt.label.toLowerCase().includes("not sure"));
      expect(
        hasNotSureValue,
        `Expected ${qCode} options not to contain 'Not sure'`
      ).toBe(false);
    }
  });

  it("verifies Q15 exact customer-facing question text", () => {
    expect(QUESTIONS.Q15.questionText).toBe(
      "How much does an hour of critical system downtime cost your organization?"
    );
    expect(QUESTIONS.Q15.allowNumericOverride).toBe(true);
    expect(QUESTIONS.Q15.overrideUnit).toBe("$ / hour");
    expect(QUESTIONS.Q15.feedsCalculation).toBe(true);
  });

  it("verifies Q16 remains generic and distinct from Q17 percentage target", () => {
    // Q16 is generic executive mandate question
    expect(QUESTIONS.Q16.title).toBe("Cost Reduction & Modernization Focus");
    expect(QUESTIONS.Q16.questionText).toBe(
      "Is your infrastructure / middleware leadership under an active mandate to reduce operating expenditures (OpEx) or modernize legacy messaging?"
    );
    expect(QUESTIONS.Q16.allowNumericOverride).toBe(false);
    expect(QUESTIONS.Q16.options?.map((o) => o.value)).toEqual([
      "Yes, aggressive OpEx reduction target",
      "Yes, moderate efficiency goal",
      "Cost-neutral / Flat budget",
      "Growing investment budget",
    ]);

    // Q17 is quantitative target percentage question
    expect(QUESTIONS.Q17.title).toBe("Target Cost Reduction Percentage");
    expect(QUESTIONS.Q17.questionText).toBe(
      "What percentage reduction in operational effort or middleware tooling spend is leadership targeting over the next 12–24 months?"
    );
    expect(QUESTIONS.Q17.allowNumericOverride).toBe(true);
    expect(QUESTIONS.Q17.overrideUnit).toBe("%");
    expect(QUESTIONS.Q17.options?.map((o) => o.value)).toEqual([
      "5–10%",
      "10–20%",
      "20–30%",
      "30%+",
      "No specific % target",
    ]);
  });
});

