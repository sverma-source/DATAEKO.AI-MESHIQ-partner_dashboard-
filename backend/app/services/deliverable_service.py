import csv
import io
import json
import os
import subprocess
import tempfile
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, EntityNotFoundError
from app.models.assessment import Assessment, AssessmentStatus
from app.models.calculation_snapshot import CalculationSnapshot


# Canonical Section & Question Definitions (Frozen Specification)
CANONICAL_SECTIONS = [
    {
        "id": "A",
        "title": "A. Environment & Cost Baseline",
        "question_ids": ["Q01", "Q02", "Q03", "Q04", "Q05"],
    },
    {
        "id": "B",
        "title": "B. Troubleshooting Economics",
        "question_ids": ["Q06", "Q07", "Q08"],
    },
    {
        "id": "C",
        "title": "C. Operational Complexity & Productivity",
        "question_ids": ["Q09", "Q10", "Q11"],
    },
    {
        "id": "D",
        "title": "D. Business Consequence & Financial Exposure",
        "question_ids": ["Q12", "Q13", "Q14", "Q15"],
    },
    {
        "id": "E",
        "title": "E. Cost Reduction & Organizational Pressure",
        "question_ids": ["Q16", "Q17"],
    },
    {
        "id": "F",
        "title": "F. Cybersecurity & Remediation",
        "question_ids": ["Q18", "Q19"],
    },
    {
        "id": "G",
        "title": "G. Economic Inputs & Timing",
        "question_ids": ["Q20", "Q21", "Q22"],
    },
]

QUESTION_METADATA = {
    "Q01": {"section": "A. Environment & Cost Baseline", "title": "Queue Manager Estate Scale"},
    "Q02": {"section": "A. Environment & Cost Baseline", "title": "Staffing & Administration Resources"},
    "Q03": {"section": "A. Environment & Cost Baseline", "title": "Staffing & Operational Model"},
    "Q04": {"section": "A. Environment & Cost Baseline", "title": "Quarterly Administration Time Overhead"},
    "Q05": {"section": "A. Environment & Cost Baseline", "title": "Retired Infrastructure & Technical Debt"},
    "Q06": {"section": "B. Troubleshooting Economics", "title": "Troubleshooting & Incident Frequency"},
    "Q07": {"section": "B. Troubleshooting Economics", "title": "Staff Hours Expended Per Investigation (Staff Effort)"},
    "Q08": {"section": "B. Troubleshooting Economics", "title": "Elapsed Investigation Duration (Clock Time)"},
    "Q09": {"section": "C. Operational Complexity & Productivity", "title": "Monitoring Tools & Management Consoles"},
    "Q10": {"section": "C. Operational Complexity & Productivity", "title": "Cross-Technology Manual Correlation Friction"},
    "Q11": {"section": "C. Operational Complexity & Productivity", "title": "Operational Productivity Constraint"},
    "Q12": {"section": "D. Business Consequence & Financial Exposure", "title": "Severity of Business Impact"},
    "Q13": {"section": "D. Business Consequence & Financial Exposure", "title": "Recent Disruption Experience"},
    "Q14": {"section": "D. Business Consequence & Financial Exposure", "title": "Representative Disruption Duration"},
    "Q15": {"section": "D. Business Consequence & Financial Exposure", "title": "Estimated Financial Cost Per Hour of Downtime"},
    "Q16": {"section": "E. Cost Reduction & Organizational Pressure", "title": "Cost-Reduction Mandate"},
    "Q17": {"section": "E. Cost Reduction & Organizational Pressure", "title": "Target OpEx Reduction Percentage"},
    "Q18": {"section": "F. Cybersecurity & Remediation", "title": "Cybersecurity & Audit Pressure"},
    "Q19": {"section": "F. Cybersecurity & Remediation", "title": "Vulnerability Remediation & Configuration Friction"},
    "Q20": {"section": "G. Economic Inputs & Timing", "title": "Fully Loaded Annual Labor Cost Override"},
    "Q21": {"section": "G. Economic Inputs & Timing", "title": "Customer-Reported Total Annual IBM MQ Spend"},
    "Q22": {"section": "G. Economic Inputs & Timing", "title": "Time to Act & Measurable Improvement Target"},
}


class DeliverableService:
    @staticmethod
    async def get_assessment_for_deliverable(
        db: AsyncSession, tenant_id: str, assessment_id: str
    ) -> Assessment:
        """
        Retrieves assessment with customer, response, and snapshots eagerly loaded,
        strictly enforcing tenant isolation.
        """
        stmt = (
            select(Assessment)
            .where(Assessment.id == assessment_id, Assessment.tenant_id == tenant_id)
            .options(
                selectinload(Assessment.customer),
                selectinload(Assessment.response),
                selectinload(Assessment.calculation_snapshots),
            )
        )
        res = await db.execute(stmt)
        assessment = res.scalar_one_or_none()
        if not assessment:
            raise EntityNotFoundError("Assessment", assessment_id)
        return assessment

    @staticmethod
    def extract_finalized_responses(assessment: Assessment) -> List[Dict[str, Any]]:
        """
        Extracts all 22 questions deterministically from server-side finalized responses.
        """
        resp = assessment.response
        raw = resp.raw_responses if (resp and resp.raw_responses) else {}

        rows = []
        for q_id in [f"Q{i:02d}" for i in range(1, 23)]:
            meta = QUESTION_METADATA[q_id]
            section = meta["section"]
            title = meta["title"]

            response_val = ""
            exact_val = ""
            is_unknown = False

            if q_id == "Q01":
                val01 = raw.get("q01_scale") or (resp.q03_environment_scale if resp else None)
                response_val = str(val01) if val01 else "Not answered"
                if raw.get("q01_override") is not None:
                    exact_val = str(raw.get("q01_override"))
            elif q_id == "Q02":
                val02 = raw.get("q02_staffing")
                response_val = str(val02) if val02 else "Not answered"
                if raw.get("q02_override") is not None:
                    exact_val = str(raw.get("q02_override"))
            elif q_id == "Q03":
                val03 = raw.get("q03_staffing_model") or (resp.q05_mq_role_split if resp else None)
                response_val = str(val03) if val03 else "Not answered"
            elif q_id == "Q04":
                raw_q04 = raw.get("q04_dropdown")
                admin_hrs = raw.get("q04_admin_hours") if raw.get("q04_admin_hours") is not None else (resp.q04_weekly_admin_hours if resp else None)
                if admin_hrs is not None:
                    exact_val = str(admin_hrs)
                if raw_q04 == "UNKNOWN":
                    response_val = "Not sure / To be assessed"
                elif raw_q04 and raw_q04 != "OVERRIDE":
                    response_val = str(raw_q04)
                elif admin_hrs is not None:
                    response_val = f"{exact_val} hours / quarter"
                else:
                    response_val = "Not answered"
            elif q_id == "Q05":
                val05 = raw.get("q05_tech_debt")
                response_val = str(val05) if val05 else "Not answered"
            elif q_id == "Q06":
                val06 = raw.get("q06_frequency") or (resp.q06_frequency_text if resp else None)
                response_val = str(val06) if val06 else "Not answered"
            elif q_id == "Q07":
                raw_q07 = raw.get("q07_labor_hours") or (resp.q07_labor_hours_text if resp else None)
                override_q07 = raw.get("q07_override") if raw.get("q07_override") is not None else (resp.q07_labor_hours_override if resp else None)
                if override_q07 is not None:
                    exact_val = str(override_q07)
                if raw_q07:
                    response_val = str(raw_q07)
                elif override_q07 is not None:
                    response_val = f"{exact_val} hours (Exact override)"
                else:
                    response_val = "Not answered"
            elif q_id == "Q08":
                val08 = raw.get("q08_duration") or (resp.q08_duration_text if resp else None)
                response_val = str(val08) if val08 else "Not answered"
            elif q_id == "Q09":
                val09 = raw.get("q09_tools_count") or (resp.q09_root_cause_categories if resp else None)
                response_val = str(val09) if val09 else "Not answered"
            elif q_id == "Q10":
                val10 = raw.get("q10_manual_tracing") or (resp.q10_problem_types if resp else None)
                response_val = str(val10) if val10 else "Not answered"
            elif q_id == "Q11":
                val11 = raw.get("q11_productivity_constraint") or (resp.q11_monitoring_status if resp else None)
                response_val = str(val11) if val11 else "Not answered"
            elif q_id == "Q12":
                val12 = raw.get("q12_business_impact") or (resp.q12_business_impact if resp else None)
                response_val = str(val12) if val12 else "Not answered"
            elif q_id == "Q13":
                val13 = raw.get("q13_recent_disruptions")
                response_val = str(val13) if val13 else "Not answered"
            elif q_id == "Q14":
                val14 = raw.get("q14_disruption_duration") or (resp.q14_duration_text if resp else None)
                response_val = str(val14) if val14 else "Not answered"
            elif q_id == "Q15":
                is_unknown = bool(raw.get("q15_is_unknown"))
                hourly_cost = raw.get("q15_hourly_cost_override") if raw.get("q15_hourly_cost_override") is not None else (resp.q15_hourly_cost_override if resp else None)
                if is_unknown:
                    response_val = "UNKNOWN"
                elif hourly_cost is not None:
                    response_val = "OVERRIDE"
                    exact_val = str(hourly_cost)
                else:
                    response_val = "Not provided"
            elif q_id == "Q16":
                val16 = raw.get("q16_cost_mandate") or (resp.q16_config_management_method if resp else None)
                response_val = str(val16) if val16 else "Not answered"
            elif q_id == "Q17":
                raw_q17 = raw.get("q17_opex_reduction")
                override_q17 = raw.get("q17_override")
                if override_q17 is not None:
                    exact_val = str(override_q17)
                if raw_q17:
                    response_val = str(raw_q17)
                elif override_q17 is not None:
                    response_val = f"{exact_val}% (Exact target)"
                else:
                    response_val = "Not answered"
            elif q_id == "Q18":
                val18 = raw.get("q18_audit_effort") or (resp.q18_audit_effort if resp else None)
                response_val = str(val18) if val18 else "Not answered"
            elif q_id == "Q19":
                val19 = raw.get("q19_documentation_effort") or (resp.q19_documentation_effort if resp else None)
                response_val = str(val19) if val19 else "Not answered"
            elif q_id == "Q20":
                use_default = raw.get("q20_use_default", True)
                salary = raw.get("q20_annual_labor_rate") if raw.get("q20_annual_labor_rate") is not None else (resp.q20_annual_labor_rate if resp else None)
                if use_default or salary is None:
                    response_val = "DEFAULT"
                    exact_val = "180000"
                else:
                    response_val = "OVERRIDE"
                    exact_val = str(salary)
            elif q_id == "Q21":
                is_unknown = bool(raw.get("q21_is_unknown"))
                spend = raw.get("q21_annual_mq_spend") if raw.get("q21_annual_mq_spend") is not None else (resp.q21_annual_mq_spend if resp else None)
                if is_unknown:
                    response_val = "UNKNOWN"
                elif spend is not None:
                    response_val = "OVERRIDE"
                    exact_val = str(spend)
                else:
                    response_val = "Not provided"
            elif q_id == "Q22":
                val22 = raw.get("q22_migration_plans") or (resp.q22_migration_plans if resp else None)
                response_val = str(val22) if val22 else "Not answered"

            rows.append({
                "question_id": q_id,
                "section": section,
                "title": title,
                "response": response_val,
                "exact_value": exact_val,
                "is_unknown": is_unknown,
            })

        return rows

    @staticmethod
    def generate_csv(assessment: Assessment) -> str:
        """
        Generates deterministic, RFC 4180 compliant CSV export containing assessment metadata
        and finalized Q01–Q22 customer discovery responses.
        """
        output = io.StringIO()
        writer = csv.writer(output, lineterminator="\n")

        # Metadata Header Block
        customer_name = assessment.customer.name if assessment.customer else "Enterprise Customer"
        submission_timestamp = assessment.updated_at.isoformat() if assessment.updated_at else ""

        writer.writerow(["Metadata", "Value"])
        writer.writerow(["Assessment ID", assessment.id])
        writer.writerow(["Customer Name", customer_name])
        writer.writerow(["Assessment Title", assessment.title])
        writer.writerow(["Status", assessment.status.value])
        writer.writerow(["Submission Timestamp", submission_timestamp])
        writer.writerow([])  # Blank row separating metadata from questions

        # Questions Table
        writer.writerow([
            "Question ID",
            "Canonical Section",
            "Question Title",
            "Finalized Response",
            "Exact Value",
            "Unknown Indicator",
        ])

        rows = DeliverableService.extract_finalized_responses(assessment)
        for r in rows:
            writer.writerow([
                r["question_id"],
                r["section"],
                r["title"],
                r["response"],
                r["exact_value"],
                "true" if r["is_unknown"] else "false",
            ])

        return output.getvalue()

    @staticmethod
    def generate_pdf(assessment: Assessment) -> bytes:
        """
        Generates deterministic A4 Executive Customer Report PDF using Playwright renderer.
        Requires an existing CalculationSnapshot. Does not recalculate or mutate assessment.
        """
        if not assessment.calculation_snapshots:
            raise EntityNotFoundError(
                "CalculationSnapshot",
                f"for assessment {assessment.id}. Calculation snapshot required before generating Executive Report PDF.",
            )

        snapshot: CalculationSnapshot = assessment.calculation_snapshots[0]

        # Prepare payload for Node renderer
        customer_payload = {
            "name": assessment.customer.name if assessment.customer else "Enterprise Customer",
            "industry": assessment.customer.industry if assessment.customer else "Enterprise Infrastructure",
        }
        assessment_payload = {
            "id": assessment.id,
            "title": assessment.title,
            "status": assessment.status.value,
            "version": assessment.assessment_version,
            "calculated_at": snapshot.calculated_at.isoformat() if snapshot.calculated_at else None,
        }
        snapshot_payload = {
            "id": snapshot.id,
            "calculation_engine_version": snapshot.calculation_engine_version,
            "assessment_version": snapshot.assessment_version,
            "calculated_at": snapshot.calculated_at.isoformat() if snapshot.calculated_at else None,
            "summary_metrics": snapshot.summary_metrics,
            "computed_metrics": snapshot.computed_metrics,
            "assumptions_used": snapshot.assumptions_used,
            "benchmarks_used": snapshot.benchmarks_used,
            "provenance_summary": snapshot.provenance_summary,
        }

        full_payload = {
            "customer": customer_payload,
            "assessment": assessment_payload,
            "snapshot": snapshot_payload,
        }

        # Use temporary files for secure inter-process transfer with automatic cleanup
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as json_file:
            json.dump(full_payload, json_file)
            json_path = json_file.name

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as pdf_file:
            pdf_path = pdf_file.name

        try:
            # Resolve script path
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
            script_path = os.path.join(project_root, "frontend/scripts/render_report_pdf.mjs")

            cmd = ["node", script_path, "--input", json_path, "--output", pdf_path]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if proc.returncode != 0:
                raise AppError(f"PDF generation process failed: {proc.stderr}")

            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()

            if not pdf_bytes or len(pdf_bytes) < 100:
                raise AppError("Generated PDF is empty or invalid.")

            return pdf_bytes
        finally:
            if os.path.exists(json_path):
                os.remove(json_path)
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
