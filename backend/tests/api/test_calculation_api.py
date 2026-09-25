import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_calculation_api_and_snapshot_persistence(client: AsyncClient):
    # 1. Setup Customer & Assessment
    cust_res = await client.post("/api/v1/customers", json={"name": "Vanguard Enterprises"})
    customer_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "Vanguard MQ Discovery Assessment"},
    )
    assessment_id = ass_res.json()["id"]

    # 2. Save Responses corresponding to Golden Master TC-01
    responses_payload = {
        "q01_company_name": "Vanguard Enterprises",
        "q04_weekly_admin_hours": 80.0,
        "q06_frequency_text": "About weekly",
        "q07_labor_hours_text": "3–5 hours",
        "q12_business_impact": "Significant",
        "q14_duration_text": "1.5–4 hours",
        "q20_annual_labor_rate": None,  # Uses $180,000 default
        "q21_annual_mq_spend": 250000.0,
    }
    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses", json=responses_payload
    )

    # 3. Trigger Calculation via POST /api/v1/assessments/{id}/calculate
    calc_res = await client.post(f"/api/v1/assessments/{assessment_id}/calculate")
    assert calc_res.status_code == 200
    calc_data = calc_res.json()

    # Verify Response Metadata
    assert calc_data["assessment_id"] == assessment_id
    assert calc_data["calculation_engine_version"] == "1.0.0"
    assert calc_data["assessment_version"] == "1.0.0"
    snapshot_id = calc_data["snapshot_id"]

    # Verify TC-01 Computed Values
    summary = calc_data["summary"]
    assert float(summary["admin_annual_hours"]) == 320.0
    assert float(summary["admin_annual_cost"]) == pytest.approx(27692.31, 0.01)
    assert float(summary["troubleshooting_annual_hours"]) == 208.0
    assert float(summary["troubleshooting_annual_cost"]) == pytest.approx(18000.00, 0.01)
    assert float(summary["total_operational_labor_cost"]) == pytest.approx(45692.31, 0.01)
    assert float(summary["operational_fte_burden"]) == pytest.approx(528 / 2080, 0.001)
    assert float(summary["representative_single_event_exposure"]) == 825000.0
    assert float(summary["total_recoverable_labor_hours"]) == 132.0
    assert float(summary["illustrative_annual_labor_savings"]) == pytest.approx(11423.08, 0.01)
    assert float(summary["troubleshooting_productivity_opportunity"]) == pytest.approx(1800.00, 0.01)

    # Verify Individual Metric States & Lineage
    metrics = calc_data["computed_metrics"]
    assert metrics["annual_admin_labor_cost"]["state"] == "VALID"
    assert metrics["annual_admin_labor_cost"]["provenance"] == "CALCULATED_RESULT"
    assert metrics["applicable_financial_rate"]["provenance"] == "INDUSTRY_BENCHMARK"
    assert float(metrics["applicable_financial_rate"]["value"]) == 300000.0

    # 4. Verify Assessment Status updated to CALCULATED
    ass_detail = await client.get(f"/api/v1/assessments/{assessment_id}")
    assert ass_detail.status_code == 200
    assert ass_detail.json()["status"] == "CALCULATED"
    assert ass_detail.json()["latest_snapshot"]["id"] == snapshot_id

    # 5. List Snapshots
    snapshots_list_res = await client.get(
        f"/api/v1/assessments/{assessment_id}/snapshots"
    )
    assert snapshots_list_res.status_code == 200
    snapshots = snapshots_list_res.json()
    assert len(snapshots) == 1
    assert snapshots[0]["id"] == snapshot_id
    assert snapshots[0]["calculation_engine_version"] == "1.0.0"

    # 6. Get Latest Snapshot
    latest_res = await client.get(
        f"/api/v1/assessments/{assessment_id}/snapshots/latest"
    )
    assert latest_res.status_code == 200
    assert latest_res.json()["id"] == snapshot_id


@pytest.mark.asyncio
async def test_calculation_with_empty_responses(client: AsyncClient):
    # Setup Customer & Empty Assessment
    cust_res = await client.post("/api/v1/customers", json={"name": "Empty Test Corp"})
    customer_id = cust_res.json()["id"]
    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "Empty Assessment"},
    )
    assessment_id = ass_res.json()["id"]

    # Calculate without saving responses
    calc_res = await client.post(f"/api/v1/assessments/{assessment_id}/calculate")
    assert calc_res.status_code == 200
    data = calc_res.json()
    assert data["summary"]["total_operational_labor_cost"] is None
    assert data["computed_metrics"]["total_quantified_labor_cost"]["state"] == "INSUFFICIENT_DATA"
