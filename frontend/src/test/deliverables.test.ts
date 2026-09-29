import { describe, it, expect } from "vitest";
import { api } from "../services/api";

describe("Deliverable API Helpers", () => {
  it("constructs correct CSV deliverable URL", () => {
    const url = api.getAssessmentCsvUrl("test-ass-123");
    expect(url).toContain("/assessments/test-ass-123/deliverables/csv");
  });

  it("constructs correct PDF deliverable URL", () => {
    const url = api.getAssessmentPdfUrl("test-ass-123");
    expect(url).toContain("/assessments/test-ass-123/deliverables/pdf");
  });
});
