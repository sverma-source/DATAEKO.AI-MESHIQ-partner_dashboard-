import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionCard } from "../components/QuestionCard";
import { QUESTIONS, normalizeResponseState } from "../data/questionCatalog";
import { AssessmentResponseState } from "../types/assessment";

// Harness simulating page.tsx state and event handlers
function PageHarness({
  initialAnswers = {},
  questionCode,
  onChangeSpy,
}: {
  initialAnswers?: Partial<AssessmentResponseState>;
  questionCode: "Q15" | "Q20" | "Q21";
  onChangeSpy?: (state: AssessmentResponseState) => void;
}) {
  const [answers, setAnswers] = useState<AssessmentResponseState>({
    q20_use_default: true,
    ...initialAnswers,
  });

  const updateAnswerField = (field: keyof AssessmentResponseState, value: any) => {
    setAnswers((prev) => {
      const next = { ...prev, [field]: value };
      if (onChangeSpy) onChangeSpy(next);
      return next;
    });
  };

  const q = QUESTIONS[questionCode];
  const qCode = q.code.toLowerCase();

  let selectedVal = "";
  if (q.code === "Q15") {
    selectedVal =
      answers.q15_dropdown ||
      (answers.q15_is_unknown
        ? "UNKNOWN"
        : answers.q15_hourly_cost_override !== undefined
        ? "OVERRIDE"
        : "");
  } else if (q.code === "Q20") {
    selectedVal = answers.q20_dropdown || (answers.q20_use_default ? "DEFAULT" : "OVERRIDE");
  } else if (q.code === "Q21") {
    selectedVal =
      answers.q21_dropdown ||
      (answers.q21_is_unknown
        ? "UNKNOWN"
        : answers.q21_annual_mq_spend !== undefined
        ? "OVERRIDE"
        : "");
  }

  const overrideVal =
    (answers as any)[`${qCode}_override`] !== undefined
      ? (answers as any)[`${qCode}_override`]
      : (answers as any)[`${qCode}_admin_hours`] !== undefined
      ? (answers as any)[`${qCode}_admin_hours`]
      : (answers as any)[`${qCode}_hourly_cost_override`] !== undefined
      ? (answers as any)[`${qCode}_hourly_cost_override`]
      : (answers as any)[`${qCode}_annual_labor_rate`] !== undefined
      ? (answers as any)[`${qCode}_annual_labor_rate`]
      : (answers as any)[`${qCode}_annual_mq_spend`];

  return (
    <QuestionCard
      question={q}
      selectedValue={selectedVal}
      overrideValue={overrideVal}
      useDefault={answers.q20_use_default}
      isUnknown={(answers as any)[`${qCode}_is_unknown`]}
      onSelectOption={(val) => {
        if (q.code === "Q15") {
          if (val === "OVERRIDE") {
            updateAnswerField("q15_dropdown", "OVERRIDE");
            updateAnswerField("q15_is_unknown", false);
          } else if (val === "UNKNOWN") {
            updateAnswerField("q15_dropdown", "UNKNOWN");
            updateAnswerField("q15_is_unknown", true);
            updateAnswerField("q15_hourly_cost_override", undefined);
          } else {
            updateAnswerField("q15_dropdown", undefined);
            updateAnswerField("q15_is_unknown", false);
            updateAnswerField("q15_hourly_cost_override", undefined);
          }
        } else if (q.code === "Q20") {
          if (val === "OVERRIDE") {
            updateAnswerField("q20_dropdown", "OVERRIDE");
            updateAnswerField("q20_use_default", false);
          } else if (val === "DEFAULT") {
            updateAnswerField("q20_dropdown", "DEFAULT");
            updateAnswerField("q20_use_default", true);
            updateAnswerField("q20_annual_labor_rate", undefined);
          } else {
            updateAnswerField("q20_dropdown", undefined);
            updateAnswerField("q20_use_default", true);
            updateAnswerField("q20_annual_labor_rate", undefined);
          }
        } else if (q.code === "Q21") {
          if (val === "OVERRIDE") {
            updateAnswerField("q21_dropdown", "OVERRIDE");
            updateAnswerField("q21_is_unknown", false);
          } else if (val === "UNKNOWN") {
            updateAnswerField("q21_dropdown", "UNKNOWN");
            updateAnswerField("q21_is_unknown", true);
            updateAnswerField("q21_annual_mq_spend", undefined);
          } else {
            updateAnswerField("q21_dropdown", undefined);
            updateAnswerField("q21_is_unknown", false);
            updateAnswerField("q21_annual_mq_spend", undefined);
          }
        }
      }}
      onOverrideChange={(num) => {
        if (q.code === "Q15") {
          updateAnswerField("q15_hourly_cost_override", num);
          if (num !== undefined) {
            updateAnswerField("q15_dropdown", "OVERRIDE");
            updateAnswerField("q15_is_unknown", false);
          }
        } else if (q.code === "Q20") {
          updateAnswerField("q20_annual_labor_rate", num);
          if (num !== undefined) {
            updateAnswerField("q20_dropdown", "OVERRIDE");
            updateAnswerField("q20_use_default", false);
          }
        } else if (q.code === "Q21") {
          updateAnswerField("q21_annual_mq_spend", num);
          if (num !== undefined) {
            updateAnswerField("q21_dropdown", "OVERRIDE");
            updateAnswerField("q21_is_unknown", false);
          }
        }
      }}
      onDefaultToggle={(def) => {
        updateAnswerField("q20_use_default", def);
        updateAnswerField("q20_dropdown", def ? "DEFAULT" : "OVERRIDE");
        if (def) {
          updateAnswerField("q20_annual_labor_rate", undefined);
        }
      }}
    />
  );
}

describe("Q15 — Estimated Financial Cost Per Hour of Downtime (Regression & Persistence)", () => {
  it("allows selecting 'Customer Provided Custom Amount', displays amount input, and persists value", () => {
    let latestState: AssessmentResponseState = {};
    const spy = vi.fn((state) => {
      latestState = state;
    });

    render(<PageHarness questionCode="Q15" onChangeSpy={spy} />);

    const selectEl = screen.getByLabelText("Q15: Estimated Financial Cost Per Hour of Downtime") as HTMLSelectElement;
    expect(selectEl.value).toBe("");

    // 1. Select "Customer Provided Custom Amount ($/hour)"
    fireEvent.change(selectEl, { target: { value: "OVERRIDE" } });
    expect(selectEl.value).toBe("OVERRIDE");
    expect(latestState.q15_dropdown).toBe("OVERRIDE");
    expect(latestState.q15_is_unknown).toBe(false);

    // 2. Verify custom amount input appears immediately
    const inputEl = screen.getByLabelText("Q15 exact numeric value: Hourly Downtime Cost Override ($/hr)") as HTMLInputElement;
    expect(inputEl).toBeInTheDocument();

    // 3. Enter custom amount 12345
    fireEvent.change(inputEl, { target: { value: "12345" } });
    expect(inputEl.value).toBe("12345");
    expect(latestState.q15_hourly_cost_override).toBe(12345);
    expect(latestState.q15_dropdown).toBe("OVERRIDE");

    // 4. Verify save and reload persistence via normalizeResponseState
    const cleanRaw = { ...latestState };
    const backendStoredResponse = {
      q15_hourly_cost_override: cleanRaw.q15_is_unknown ? null : cleanRaw.q15_hourly_cost_override,
      raw_responses: cleanRaw,
    };
    const rehydrated = normalizeResponseState(backendStoredResponse, QUESTIONS);
    expect(rehydrated.q15_hourly_cost_override).toBe(12345);
    expect(rehydrated.q15_is_unknown).toBe(false);
    expect(rehydrated.q15_dropdown).toBe("OVERRIDE");
  });

  it("allows selecting 'Unknown / Use Industry Benchmark' and clears override", () => {
    let latestState: AssessmentResponseState = {
      q15_hourly_cost_override: 12345,
      q15_dropdown: "OVERRIDE",
      q15_is_unknown: false,
    };
    const spy = vi.fn((state) => {
      latestState = state;
    });

    render(
      <PageHarness
        questionCode="Q15"
        initialAnswers={latestState}
        onChangeSpy={spy}
      />
    );

    const selectEl = screen.getByLabelText("Q15: Estimated Financial Cost Per Hour of Downtime") as HTMLSelectElement;
    expect(selectEl.value).toBe("OVERRIDE");

    // Select Unknown
    fireEvent.change(selectEl, { target: { value: "UNKNOWN" } });
    expect(selectEl.value).toBe("UNKNOWN");
    expect(latestState.q15_is_unknown).toBe(true);
    expect(latestState.q15_hourly_cost_override).toBeUndefined();
    expect(latestState.q15_dropdown).toBe("UNKNOWN");

    // Override input should not be open
    expect(screen.queryByLabelText("Q15 exact numeric value: Hourly Downtime Cost Override ($/hr)")).not.toBeInTheDocument();
  });
});

describe("Q20 — Fully Loaded Annual Labor Cost Override (Regression & Persistence)", () => {
  it("allows selecting 'Customer Specific Annual Loaded Cost', does not revert to baseline, and displays amount input", () => {
    let latestState: AssessmentResponseState = {};
    const spy = vi.fn((state) => {
      latestState = state;
    });

    render(<PageHarness questionCode="Q20" onChangeSpy={spy} />);

    const selectEl = screen.getByLabelText("Q20: Fully Loaded Annual Labor Cost Override") as HTMLSelectElement;
    expect(selectEl.value).toBe("DEFAULT");

    // 1. Select "Customer Specific Annual Loaded Cost ($/year)"
    fireEvent.change(selectEl, { target: { value: "OVERRIDE" } });
    expect(selectEl.value).toBe("OVERRIDE");
    expect(latestState.q20_dropdown).toBe("OVERRIDE");
    expect(latestState.q20_use_default).toBe(false);

    // 2. Custom salary amount input appears
    const inputEl = screen.getByLabelText("Q20 exact numeric value: Custom Annual Loaded Salary ($/yr)") as HTMLInputElement;
    expect(inputEl).toBeInTheDocument();

    // 3. Indicator reflects Custom Salary
    expect(screen.getByText("Using Custom Salary")).toBeInTheDocument();

    // 4. Enter custom salary 234567
    fireEvent.change(inputEl, { target: { value: "234567" } });
    expect(inputEl.value).toBe("234567");
    expect(latestState.q20_annual_labor_rate).toBe(234567);
    expect(latestState.q20_use_default).toBe(false);

    // 5. Verify save and reload persistence via normalizeResponseState
    const cleanRaw = { ...latestState };
    const backendStoredResponse = {
      q20_annual_labor_rate: cleanRaw.q20_use_default ? null : cleanRaw.q20_annual_labor_rate,
      raw_responses: cleanRaw,
    };
    const rehydrated = normalizeResponseState(backendStoredResponse, QUESTIONS);
    expect(rehydrated.q20_annual_labor_rate).toBe(234567);
    expect(rehydrated.q20_use_default).toBe(false);
    expect(rehydrated.q20_dropdown).toBe("OVERRIDE");
  });

  it("can toggle between custom salary and model baseline cleanly", () => {
    let latestState: AssessmentResponseState = {
      q20_annual_labor_rate: 234567,
      q20_dropdown: "OVERRIDE",
      q20_use_default: false,
    };
    const spy = vi.fn((state) => {
      latestState = state;
    });

    render(
      <PageHarness
        questionCode="Q20"
        initialAnswers={latestState}
        onChangeSpy={spy}
      />
    );

    // Click indicator button to toggle back to default
    const toggleBtn = screen.getByText("Using Custom Salary");
    fireEvent.click(toggleBtn);

    expect(latestState.q20_use_default).toBe(true);
    expect(latestState.q20_dropdown).toBe("DEFAULT");
    expect(latestState.q20_annual_labor_rate).toBeUndefined();

    const selectEl = screen.getByLabelText("Q20: Fully Loaded Annual Labor Cost Override") as HTMLSelectElement;
    expect(selectEl.value).toBe("DEFAULT");
  });
});

describe("Q21 — Customer-Reported Total Annual IBM MQ Spend (Regression & Persistence)", () => {
  it("allows selecting 'Customer Provided Annual Spend', displays input, and persists value", () => {
    let latestState: AssessmentResponseState = {};
    const spy = vi.fn((state) => {
      latestState = state;
    });

    render(<PageHarness questionCode="Q21" onChangeSpy={spy} />);

    const selectEl = screen.getByLabelText("Q21: Customer-Reported Total Annual IBM MQ Spend") as HTMLSelectElement;
    expect(selectEl.value).toBe("");

    // 1. Select "Customer Provided Annual Spend ($/year)"
    fireEvent.change(selectEl, { target: { value: "OVERRIDE" } });
    expect(selectEl.value).toBe("OVERRIDE");
    expect(latestState.q21_dropdown).toBe("OVERRIDE");
    expect(latestState.q21_is_unknown).toBe(false);

    // 2. Custom spend input appears immediately
    const inputEl = screen.getByLabelText("Q21 exact numeric value: Total Annual MQ Spend ($/yr)") as HTMLInputElement;
    expect(inputEl).toBeInTheDocument();

    // 3. Enter annual spend 345678
    fireEvent.change(inputEl, { target: { value: "345678" } });
    expect(inputEl.value).toBe("345678");
    expect(latestState.q21_annual_mq_spend).toBe(345678);

    // 4. Verify save and reload persistence via normalizeResponseState
    const cleanRaw = { ...latestState };
    const backendStoredResponse = {
      q21_annual_mq_spend: cleanRaw.q21_is_unknown ? null : cleanRaw.q21_annual_mq_spend,
      raw_responses: cleanRaw,
    };
    const rehydrated = normalizeResponseState(backendStoredResponse, QUESTIONS);
    expect(rehydrated.q21_annual_mq_spend).toBe(345678);
    expect(rehydrated.q21_is_unknown).toBe(false);
    expect(rehydrated.q21_dropdown).toBe("OVERRIDE");
  });

  it("allows selecting 'Unknown / Not Disclosed' and clears amount", () => {
    let latestState: AssessmentResponseState = {
      q21_annual_mq_spend: 345678,
      q21_dropdown: "OVERRIDE",
      q21_is_unknown: false,
    };
    const spy = vi.fn((state) => {
      latestState = state;
    });

    render(
      <PageHarness
        questionCode="Q21"
        initialAnswers={latestState}
        onChangeSpy={spy}
      />
    );

    const selectEl = screen.getByLabelText("Q21: Customer-Reported Total Annual IBM MQ Spend") as HTMLSelectElement;
    expect(selectEl.value).toBe("OVERRIDE");

    // Select Unknown
    fireEvent.change(selectEl, { target: { value: "UNKNOWN" } });
    expect(selectEl.value).toBe("UNKNOWN");
    expect(latestState.q21_is_unknown).toBe(true);
    expect(latestState.q21_annual_mq_spend).toBeUndefined();
    expect(latestState.q21_dropdown).toBe("UNKNOWN");

    expect(screen.queryByLabelText("Q21 exact numeric value: Total Annual MQ Spend ($/yr)")).not.toBeInTheDocument();
  });
});
