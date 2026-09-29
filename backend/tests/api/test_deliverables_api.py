import csv
import io
import pytest
from httpx import AsyncClient


@pytest.fixture
def sample_payload():
    return {
        "q01_company_name": "Acme Global Financial",
        "q02_industry": "Banking & Capital Markets",
        "q03_environment_scale": "51–100",
        "q04_weekly_admin_hours": 12.0,
        "q05_mq_role_split": "Dedicated MQ engineering",
        "q06_frequency_text": "About weekly",
        "q07_labor_hours_text": "3–5 hours",
        "q07_labor_hours_override": 4.0,
        "q08_duration_text": "1–4 hours",
        "q09_root_cause_categories": "2–3 disparate tools",
        "q10_problem_types": "Mostly manual with some log scripts",
        "q11_monitoring_status": "Repetitive manual queue configuration",
        "q12_business_impact": "Significant",
        "q13_annual_outage_count": 1.0,
        "q14_duration_text": "46–90 minutes",
        "q15_hourly_cost_override": 150000.0,
        "q16_config_management_method": "Yes, aggressive OpEx reduction target",
        "q17_audit_frequency": "10–20%",
        "q18_audit_effort": "Moderate pressure",
        "q19_documentation_effort": "Moderate friction",
        "q20_annual_labor_rate": 180000.0,
        "q21_annual_mq_spend": 500000.0,
        "q22_migration_plans": "Near-term (90–180 days)",
        "raw_responses": {
            "q01_scale": "51–100 Queue Managers",
            "q01_override": 75,
            "q02_staffing": "3–5 Engineers",
            "q02_override": 4,
            "q03_staffing_model": "Centralized dedicated MQ team",
            "q04_dropdown": "40–100 hours / quarter",
            "q04_admin_hours": 80.0,
            "q05_tech_debt": "Yes, significant technical debt",
            "q06_frequency": "About weekly (52 events/year)",
            "q07_labor_hours": "3–5 hours",
            "q07_override": 4.0,
            "q08_duration": "1–4 hours",
            "q09_tools_count": "2–3 disparate tools",
            "q10_manual_tracing": "Mostly manual with some log scripts",
            "q11_productivity_constraint": "Repetitive manual queue configuration",
            "q12_business_impact": "Significant",
            "q13_recent_disruptions": "Yes, 1–2 significant disruptions",
            "q14_disruption_duration": "46–90 minutes",
            "q15_hourly_cost_override": 150000.0,
            "q16_cost_mandate": "Yes, aggressive OpEx reduction target",
            "q17_opex_reduction": "10–20%",
            "q17_override": 15.0,
            "q18_audit_effort": "Moderate pressure",
            "q19_documentation_effort": "Moderate friction",
            "q20_use_default": True,
            "q20_annual_labor_rate": 180000.0,
            "q21_annual_mq_spend": 500000.0,
            "q22_migration_plans": "Near-term (90–180 days)",
        },
    }


@pytest.mark.asyncio
async def test_csv_deliverable_generation_and_content(
    client: AsyncClient,
    sample_payload: dict,
):
    """
    Test that an authorized user can generate a valid, deterministic CSV deliverable
    for a submitted assessment containing all 22 questions and metadata.
    """
    # 1. Setup Customer & Assessment
    cust_res = await client.post("/api/v1/customers", json={"name": "Acme Global Financial"})
    customer_id = cust_res.json()["id"]

    create_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "CSV Deliverable Test"},
    )
    assert create_res.status_code == 201
    assessment_id = create_res.json()["id"]

    # 2. Save responses & submit
    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=sample_payload,
    )
    submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    # 3. Download CSV deliverable
    csv_res = await client.get(f"/api/v1/assessments/{assessment_id}/deliverables/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert f'filename="assessment_{assessment_id}_responses.csv"' in csv_res.headers["content-disposition"]

    csv_text = csv_res.text
    reader = list(csv.reader(io.StringIO(csv_text)))

    # Verify metadata block
    metadata_map = {}
    row_idx = 0
    while row_idx < len(reader) and reader[row_idx] and reader[row_idx][0] != "Question ID":
        if len(reader[row_idx]) >= 2:
            metadata_map[reader[row_idx][0]] = reader[row_idx][1]
        row_idx += 1

    assert metadata_map.get("Assessment ID") == assessment_id
    assert metadata_map.get("Customer Name") == "Acme Global Financial"
    assert metadata_map.get("Assessment Title") == "CSV Deliverable Test"
    assert metadata_map.get("Status") == "SUBMITTED"

    # Find table header
    while row_idx < len(reader) and (not reader[row_idx] or reader[row_idx][0] != "Question ID"):
        row_idx += 1

    assert row_idx < len(reader)
    header = reader[row_idx]
    assert header == [
        "Question ID",
        "Canonical Section",
        "Question Title",
        "Finalized Response",
        "Exact Value",
        "Unknown Indicator",
    ]

    # Verify all 22 questions are present in order
    question_rows = reader[row_idx + 1:]
    assert len(question_rows) == 22

    q_ids = [r[0] for r in question_rows]
    expected_q_ids = [f"Q{i:02d}" for i in range(1, 23)]
    assert q_ids == expected_q_ids

    # Verify canonical sections mapping
    sections = [r[1] for r in question_rows]
    assert sections[0] == "A. Environment & Cost Baseline"  # Q01
    assert sections[5] == "B. Troubleshooting Economics"    # Q06
    assert sections[8] == "C. Operational Complexity & Productivity"  # Q09
    assert sections[11] == "D. Business Consequence & Financial Exposure"  # Q12
    assert sections[15] == "E. Cost Reduction & Organizational Pressure"  # Q16
    assert sections[17] == "F. Cybersecurity & Remediation"  # Q18
    assert sections[19] == "G. Economic Inputs & Timing"  # Q20

    # Verify immutability: assessment status remains SUBMITTED
    get_res = await client.get(f"/api/v1/assessments/{assessment_id}")
    assert get_res.json()["status"] == "SUBMITTED"


@pytest.mark.asyncio
async def test_pdf_deliverable_requires_calculation_snapshot(
    client: AsyncClient,
    sample_payload: dict,
):
    """
    Test that PDF generation returns 404/error if assessment has not yet been calculated,
    preventing silent calculation invocation during deliverable generation.
    """
    cust_res = await client.post("/api/v1/customers", json={"name": "Pre-Calc Client"})
    customer_id = cust_res.json()["id"]

    create_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "PDF Pre-Calc Test"},
    )
    assessment_id = create_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=sample_payload,
    )

    # Attempt PDF generation BEFORE calculation -> must return 404 EntityNotFound
    pdf_res = await client.get(f"/api/v1/assessments/{assessment_id}/deliverables/pdf")
    assert pdf_res.status_code == 404
    assert "CalculationSnapshot" in pdf_res.json()["detail"]


@pytest.mark.asyncio
async def test_pdf_deliverable_generation_after_calculation(
    client: AsyncClient,
    sample_payload: dict,
):
    """
    Test that PDF deliverable is generated as non-empty application/pdf when calculation snapshot exists.
    """
    cust_res = await client.post("/api/v1/customers", json={"name": "Post-Calc Client"})
    customer_id = cust_res.json()["id"]

    create_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "PDF Post-Calc Test"},
    )
    assessment_id = create_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=sample_payload,
    )
    calc_res = await client.post(f"/api/v1/assessments/{assessment_id}/calculate")
    assert calc_res.status_code == 200

    pdf_res = await client.get(f"/api/v1/assessments/{assessment_id}/deliverables/pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert f'filename="DATAEKO_meshIQ_Executive_Report_{assessment_id}.pdf"' in pdf_res.headers["content-disposition"]
    assert len(pdf_res.content) > 1000
    assert pdf_res.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_deliverable_cross_tenant_isolation(
    client: AsyncClient,
    sample_payload: dict,
):
    """
    Test that deliverables are strictly isolated by tenant and reject cross-tenant requests.
    """
    cust_res = await client.post("/api/v1/customers", json={"name": "Tenant Iso Client"})
    customer_id = cust_res.json()["id"]

    create_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "Tenant Isolation Test"},
    )
    assessment_id = create_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=sample_payload,
    )

    foreign_headers = {"X-Tenant-ID": "foreign-tenant-9999"}

    # Cross-tenant CSV request -> 404
    csv_res = await client.get(
        f"/api/v1/assessments/{assessment_id}/deliverables/csv",
        headers=foreign_headers,
    )
    assert csv_res.status_code == 404

    # Cross-tenant PDF request -> 404
    pdf_res = await client.get(
        f"/api/v1/assessments/{assessment_id}/deliverables/pdf",
        headers=foreign_headers,
    )
    assert pdf_res.status_code == 404

