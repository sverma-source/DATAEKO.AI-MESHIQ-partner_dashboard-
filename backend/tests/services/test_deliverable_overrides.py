import csv
import io
import pytest
from httpx import AsyncClient

from app.api.deps import DEFAULT_TENANT_ID
from app.core.rbac import Role
from app.core.security import create_access_token, get_password_hash
from app.models.assessment import Assessment, AssessmentStatus
from app.models.assessment_response import AssessmentResponse
from app.models.customer import Customer
from app.models.user import User
from app.calculation_engine.constants import DEFAULT_ANNUAL_LOADED_LABOR_COST
from app.services.deliverable_service import DeliverableService
from app.services.email_service import EmailService


@pytest.mark.asyncio
async def test_extract_finalized_responses_q07_q17_overrides():
    """
    REGRESSION TEST:
    A. Q07 override-only case:
       q07_labor_hours = null/empty, q07_labor_hours_override = 8.5
       - primary finalized response contains 8.5;
       - it does NOT contain 'None';
       - email does NOT contain 'None (Specified:';
       - CSV does NOT contain 'None (Specified:'.

    B. Q17 override-only case:
       q17_opex_reduction = null/empty, q17_override = 18
       - primary finalized response contains 18%;
       - it does NOT contain 'Not answered';
       - email does NOT contain 'Not answered (Specified:';
       - CSV does NOT contain 'Not answered (Specified:'.
    """
    customer = Customer(id="cust-override-test", tenant_id=DEFAULT_TENANT_ID, name="Acme QA Testing")
    assessment = Assessment(
        id="ass-override-test",
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=customer.id,
        title="Override Deliverable Verification",
        status=AssessmentStatus.SUBMITTED,
    )
    assessment.customer = customer

    # Assessment response with only overrides for Q07 and Q17
    resp = AssessmentResponse(
        id="resp-override-test",
        assessment_id=assessment.id,
        q07_labor_hours_text=None,
        q07_labor_hours_override=8.5,
        raw_responses={
            "q07_labor_hours": None,
            "q07_override": 8.5,
            "q17_opex_reduction": None,
            "q17_override": 18,
        },
    )
    assessment.response = resp

    # 1. Test extractor
    rows = DeliverableService.extract_finalized_responses(assessment)
    row_map = {r["question_id"]: r for r in rows}

    q07_row = row_map["Q07"]
    assert "8.5" in q07_row["response"]
    assert "None" not in q07_row["response"]
    assert q07_row["exact_value"] == "8.5"

    q17_row = row_map["Q17"]
    assert "18%" in q17_row["response"]
    assert "Not answered" not in q17_row["response"]
    assert q17_row["exact_value"] == "18"

    # 2. Test CSV generation
    csv_text = DeliverableService.generate_csv(assessment)
    assert "None (Specified:" not in csv_text
    assert "Not answered (Specified:" not in csv_text
    assert "8.5 hours (Exact override)" in csv_text
    assert "18% (Exact target)" in csv_text

    # 3. Test Email generation
    client_email = EmailService.create_client_submission_email(
        recipient_email="test.client@acme.qa",
        recipient_name="QA Client User",
        customer_name=customer.name,
        assessment_title=assessment.title,
        assessment_id=assessment.id,
        responses=rows,
    )

    assert "None (Specified:" not in client_email.text_body
    assert "None (Specified:" not in client_email.html_body
    assert "Not answered (Specified:" not in client_email.text_body
    assert "Not answered (Specified:" not in client_email.html_body

    assert "8.5 hours (Exact override)" in client_email.text_body
    assert "8.5 hours (Exact override)" in client_email.html_body
    assert "18% (Exact target)" in client_email.text_body
    assert "18% (Exact target)" in client_email.html_body


@pytest.mark.asyncio
async def test_csv_deliverable_api_with_q07_q17_overrides(client: AsyncClient, auth_headers: dict):
    """
    End-to-end API test for CSV deliverable download with Q07 and Q17 custom overrides.
    """
    cust_res = await client.post("/api/v1/customers", json={"name": "Override API Client"}, headers=auth_headers)
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    create_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "API Deliverable Override Test"},
        headers=auth_headers,
    )
    assert create_res.status_code == 201
    assessment_id = create_res.json()["id"]

    payload = {
        "q07_labor_hours_text": None,
        "q07_labor_hours_override": 8.5,
        "raw_responses": {
            "q07_labor_hours": None,
            "q07_override": 8.5,
            "q17_opex_reduction": None,
            "q17_override": 18.0,
        },
    }

    save_res = await client.put(f"/api/v1/assessments/{assessment_id}/responses", json=payload, headers=auth_headers)
    assert save_res.status_code == 200

    calc_res = await client.post(f"/api/v1/assessments/{assessment_id}/calculate", headers=auth_headers)
    assert calc_res.status_code == 200

    submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
    assert submit_res.status_code == 200

    csv_res = await client.get(f"/api/v1/assessments/{assessment_id}/deliverables/csv", headers=auth_headers)
    assert csv_res.status_code == 200
    csv_text = csv_res.text

    assert "None (Specified:" not in csv_text
    assert "Not answered (Specified:" not in csv_text
    assert "8.5 hours (Exact override)" in csv_text
    assert "18.0% (Exact target)" in csv_text


@pytest.mark.asyncio
async def test_q07_override_only_6_hours_serialization():
    """
    REGRESSION TEST: Client 02 QA Issue 1
    Q07 override-only case with 6 hours (integer/float):
    UI shows '6 hours (Exact override)'.
    Email and deliverable CSV must show '6 hours (Exact override)',
    NOT 'None (Specified: 6)' or 'Specified: 6'.
    """
    customer = Customer(id="cust-override-6", tenant_id=DEFAULT_TENANT_ID, name="DATAEKO UX Verification Client 02")
    assessment = Assessment(
        id="ass-override-6",
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=customer.id,
        title="Client 02 Assessment",
        status=AssessmentStatus.SUBMITTED,
    )
    assessment.customer = customer

    resp = AssessmentResponse(
        id="resp-override-6",
        assessment_id=assessment.id,
        q07_labor_hours_text=None,
        q07_labor_hours_override=6.0,
        raw_responses={
            "q07_override": 6,
        },
    )
    assessment.response = resp

    rows = DeliverableService.extract_finalized_responses(assessment)
    row_map = {r["question_id"]: r for r in rows}

    q07_row = row_map["Q07"]
    assert q07_row["response"] == "6 hours (Exact override)"
    assert q07_row["exact_value"] == "6"

    # CSV Verification
    csv_text = DeliverableService.generate_csv(assessment)
    assert "None (Specified: 6)" not in csv_text
    assert "6 hours (Exact override)" in csv_text

    # Email Verification (Plain text and HTML)
    client_email = EmailService.create_client_submission_email(
        recipient_email="ux.verify02@dataeko.ai",
        recipient_name="UX Verification User 02",
        customer_name=customer.name,
        assessment_title=assessment.title,
        assessment_id=assessment.id,
        responses=rows,
    )

    assert "None (Specified: 6)" not in client_email.text_body
    assert "None (Specified: 6)" not in client_email.html_body
    assert "Specified: 6" not in client_email.text_body
    assert "Specified: 6" not in client_email.html_body
    assert "[Q07] Staff Hours Expended Per Investigation (Staff Effort): 6 hours (Exact override)" in client_email.text_body
    assert "<strong>6 hours (Exact override)</strong>" in client_email.html_body


@pytest.mark.asyncio
async def test_customer_facing_label_and_section_title_consistency():
    """
    REGRESSION TEST: Client 02 QA Issues 2 & 3
    Verify Section G title alignment and customer-friendly question titles:
    - Section G must be 'G. Team Economics & Transformation Timeline'
    - Internal/audit-style labels must NOT appear in customer deliverables/emails:
      * 'Retired Infrastructure & Technical Debt'
      * 'Cross-Technology Manual Correlation Friction'
      * 'Cost-Reduction Mandate'
      * 'Target OpEx Reduction Percentage'
      * 'Fully Loaded Annual Labor Cost Override'
      * 'Time to Act & Measurable Improvement Target'
      * 'Economic Inputs & Timing'
    - Customer-friendly titles must be present:
      * 'Older or Inactive Queue Managers'
      * 'End-to-End Transaction Tracing'
      * 'Cost Reduction & Modernization Focus'
      * 'Target Cost Reduction Percentage'
      * 'Annual Engineering Labor Cost'
      * 'Target Improvement Timeline'
    """
    customer = Customer(id="cust-labels-test", tenant_id=DEFAULT_TENANT_ID, name="Acme Corporation")
    assessment = Assessment(
        id="ass-labels-test",
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=customer.id,
        title="Acme Discovery",
        status=AssessmentStatus.SUBMITTED,
    )
    assessment.customer = customer

    resp = AssessmentResponse(
        id="resp-labels-test",
        assessment_id=assessment.id,
        raw_responses={},
    )
    assessment.response = resp

    rows = DeliverableService.extract_finalized_responses(assessment)
    row_map = {r["question_id"]: r for r in rows}

    # Section G title
    assert row_map["Q20"]["section"] == "G. Team Economics & Transformation Timeline"
    assert row_map["Q21"]["section"] == "G. Team Economics & Transformation Timeline"
    assert row_map["Q22"]["section"] == "G. Team Economics & Transformation Timeline"

    # Customer-friendly titles
    assert row_map["Q05"]["title"] == "Older or Inactive Queue Managers"
    assert row_map["Q10"]["title"] == "End-to-End Transaction Tracing"
    assert row_map["Q16"]["title"] == "Cost Reduction & Modernization Focus"
    assert row_map["Q17"]["title"] == "Target Cost Reduction Percentage"
    assert row_map["Q20"]["title"] == "Annual Engineering Labor Cost"
    assert row_map["Q22"]["title"] == "Target Improvement Timeline"

    # Forbidden internal/audit-style strings
    forbidden_labels = [
        "Retired Infrastructure & Technical Debt",
        "Cross-Technology Manual Correlation Friction",
        "Cost-Reduction Mandate",
        "Target OpEx Reduction Percentage",
        "Fully Loaded Annual Labor Cost Override",
        "Time to Act & Measurable Improvement Target",
        "Economic Inputs & Timing",
    ]

    all_titles_and_sections = " ".join([f"{r['section']} {r['title']}" for r in rows])
    for forbidden in forbidden_labels:
        assert forbidden not in all_titles_and_sections, f"Forbidden label '{forbidden}' found in deliverable rows"

    # Email test
    client_email = EmailService.create_client_submission_email(
        recipient_email="client@acme.com",
        recipient_name="Acme User",
        customer_name=customer.name,
        assessment_title=assessment.title,
        assessment_id=assessment.id,
        responses=rows,
    )

    for forbidden in forbidden_labels:
        assert forbidden not in client_email.text_body, f"Forbidden label '{forbidden}' found in email text body"
        assert forbidden not in client_email.html_body, f"Forbidden label '{forbidden}' found in email HTML body"

    assert "--- G. Team Economics & Transformation Timeline ---" in client_email.text_body
    assert "G. Team Economics & Transformation Timeline" in client_email.html_body


@pytest.mark.asyncio
async def test_customer_email_numeric_responses_rendered_human_readable():
    """
    REGRESSION TEST: Client 02 QA Numeric Response Serialization in Customer Email
    Verifies that customer email does NOT expose internal override metadata:
      - 'OVERRIDE (Specified: 80)'
      - 'OVERRIDE (Specified: 150000)'
      - 'OVERRIDE (Specified: 180000)'
      - 'OVERRIDE (Specified: 1000000)'
    And instead renders the resolved human-readable values:
      - Q04: 80 hours / quarter
      - Q15: $150,000 / hour
      - Q20: $180,000 / year
      - Q21: $1,000,000 / year
    While preserving internal exact_value/override metadata for calculation/CSV/audit.
    """
    customer = Customer(id="cust-client02-test", tenant_id=DEFAULT_TENANT_ID, name="DATAEKO UX Verification Client 02")
    assessment = Assessment(
        id="ass-client02-test",
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=customer.id,
        title="IBM MQ Discovery Assessment",
        status=AssessmentStatus.SUBMITTED,
    )
    assessment.customer = customer

    resp = AssessmentResponse(
        id="resp-client02-test",
        assessment_id=assessment.id,
        q04_weekly_admin_hours=80.0,
        q07_labor_hours_override=6.0,
        q15_hourly_cost_override=150000.0,
        q20_annual_labor_rate=180000.0,
        q21_annual_mq_spend=1000000.0,
        raw_responses={
            "q04_dropdown": "OVERRIDE",
            "q04_admin_hours": 80,
            "q07_override": 6,
            "q15_dropdown": "OVERRIDE",
            "q15_is_unknown": False,
            "q15_hourly_cost_override": 150000,
            "q20_dropdown": "OVERRIDE",
            "q20_use_default": False,
            "q20_annual_labor_rate": 180000,
            "q21_dropdown": "OVERRIDE",
            "q21_is_unknown": False,
            "q21_annual_mq_spend": 1000000,
        },
    )
    assessment.response = resp

    # 1. Extractor verification: Internal exact_value and override tokens preserved
    rows = DeliverableService.extract_finalized_responses(assessment)
    row_map = {r["question_id"]: r for r in rows}

    assert row_map["Q04"]["exact_value"] == "80"
    assert row_map["Q07"]["exact_value"] == "6"
    assert row_map["Q15"]["exact_value"] == "150000"
    assert row_map["Q15"]["response"] == "OVERRIDE"
    assert row_map["Q20"]["exact_value"] == "180000"
    assert row_map["Q20"]["response"] == "OVERRIDE"
    assert row_map["Q21"]["exact_value"] == "1000000"
    assert row_map["Q21"]["response"] == "OVERRIDE"

    # 2. Email verification: Client confirmation email resolves values to UI human-readable format
    client_email = EmailService.create_client_submission_email(
        recipient_email="ux.verify02@dataeko.ai",
        recipient_name="UX Verification User 02",
        customer_name=customer.name,
        assessment_title=assessment.title,
        assessment_id=assessment.id,
        responses=rows,
    )

    # Strictly assert that OVERRIDE metadata is never exposed
    assert "OVERRIDE (Specified:" not in client_email.text_body
    assert "OVERRIDE (Specified:" not in client_email.html_body
    assert "OVERRIDE (Specified: 80)" not in client_email.text_body
    assert "OVERRIDE (Specified: 80)" not in client_email.html_body
    assert "OVERRIDE (Specified: 150000)" not in client_email.text_body
    assert "OVERRIDE (Specified: 150000)" not in client_email.html_body
    assert "OVERRIDE (Specified: 180000)" not in client_email.text_body
    assert "OVERRIDE (Specified: 180000)" not in client_email.html_body
    assert "OVERRIDE (Specified: 1000000)" not in client_email.text_body
    assert "OVERRIDE (Specified: 1000000)" not in client_email.html_body

    # Assert resolved human-readable values in plain text
    assert "[Q04] Quarterly Administration Time Overhead: 80 hours / quarter" in client_email.text_body
    assert "[Q07] Staff Hours Expended Per Investigation (Staff Effort): 6 hours (Exact override)" in client_email.text_body
    assert "[Q15] Estimated Financial Cost Per Hour of Downtime: $150,000 / hour" in client_email.text_body
    assert "[Q20] Annual Engineering Labor Cost: $180,000 / year" in client_email.text_body
    assert "[Q21] Customer-Reported Total Annual IBM MQ Spend: $1,000,000 / year" in client_email.text_body

    # Assert resolved human-readable values in HTML
    assert "<strong>80 hours / quarter</strong>" in client_email.html_body
    assert "<strong>6 hours (Exact override)</strong>" in client_email.html_body
    assert "<strong>$150,000 / hour</strong>" in client_email.html_body
    assert "<strong>$180,000 / year</strong>" in client_email.html_body
    assert "<strong>$1,000,000 / year</strong>" in client_email.html_body

    # 3. Direct raw responses with OVERRIDE token test
    direct_rows = [
        {"question_id": "Q04", "title": "Quarterly Administration Time Overhead", "response": "OVERRIDE", "exact_value": "80"},
        {"question_id": "Q15", "title": "Estimated Financial Cost Per Hour of Downtime", "response": "OVERRIDE", "exact_value": "150000"},
        {"question_id": "Q20", "title": "Annual Engineering Labor Cost", "response": "OVERRIDE", "exact_value": "180000"},
        {"question_id": "Q21", "title": "Customer-Reported Total Annual IBM MQ Spend", "response": "OVERRIDE", "exact_value": "1000000"},
    ]
    direct_email = EmailService.create_client_submission_email(
        recipient_email="ux.verify02@dataeko.ai",
        recipient_name="UX Verification User 02",
        customer_name=customer.name,
        assessment_title=assessment.title,
        assessment_id=assessment.id,
        responses=direct_rows,
    )
    assert "OVERRIDE" not in direct_email.text_body
    assert "OVERRIDE" not in direct_email.html_body
    assert "80 hours / quarter" in direct_email.text_body
    assert "$150,000 / hour" in direct_email.text_body
    assert "$180,000 / year" in direct_email.text_body
    assert "$1,000,000 / year" in direct_email.text_body

    # 4. Q20 DEFAULT baseline presentation regression assertion:
    # Verifies that EmailService reuses authoritative DEFAULT_ANNUAL_LOADED_LABOR_COST dynamically
    default_q20_formatted = f"${int(DEFAULT_ANNUAL_LOADED_LABOR_COST):,} / year"
    assert EmailService.format_client_response_value("Q20", "DEFAULT", None) == default_q20_formatted
    assert EmailService.format_client_response_value("Q20", "DEFAULT", "") == default_q20_formatted
    assert EmailService.format_client_response_value("Q20", None, None) == default_q20_formatted

    resp_default = AssessmentResponse(
        id="resp-q20-def-test",
        assessment_id=assessment.id,
        raw_responses={"q20_use_default": True},
    )
    assessment.response = resp_default
    rows_def = DeliverableService.extract_finalized_responses(assessment)
    q20_def_row = next(r for r in rows_def if r["question_id"] == "Q20")
    assert q20_def_row["response"] == "DEFAULT"
    assert q20_def_row["exact_value"] == str(int(DEFAULT_ANNUAL_LOADED_LABOR_COST))

    email_def = EmailService.create_client_submission_email(
        recipient_email="ux.verify02@dataeko.ai",
        recipient_name="UX Verification User 02",
        customer_name=customer.name,
        assessment_title=assessment.title,
        assessment_id=assessment.id,
        responses=rows_def,
    )
    assert f"[Q20] Annual Engineering Labor Cost: {default_q20_formatted}" in email_def.text_body
    assert f"<strong>{default_q20_formatted}</strong>" in email_def.html_body
