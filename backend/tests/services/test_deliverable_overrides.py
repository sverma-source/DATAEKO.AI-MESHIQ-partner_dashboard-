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
