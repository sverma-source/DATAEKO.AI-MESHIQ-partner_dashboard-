import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_assessment_response_persistence(client: AsyncClient):
    # Setup Customer & Assessment
    cust_res = await client.post("/api/v1/customers", json={"name": "Pinnacle Health Systems"})
    customer_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "Pinnacle Health Assessment"},
    )
    assessment_id = ass_res.json()["id"]

    # 1. Verify 404 when getting non-existent responses
    get_empty = await client.get(f"/api/v1/assessments/{assessment_id}/responses")
    assert get_empty.status_code == 404

    # 2. Save Responses (preserving exact strings and overrides)
    responses_payload = {
        "q01_company_name": "Pinnacle Health Systems",
        "q02_industry": "Healthcare & Life Sciences",
        "q03_environment_scale": "50-100 Queue Managers",
        "q04_weekly_admin_hours": 15.0,
        "q05_mq_role_split": "Shared operations team",
        "q06_frequency_text": "Weekly",
        "q07_labor_hours_text": "1-4 hours",
        "q08_duration_text": "1-2 hours",
        "q09_root_cause_categories": "Configuration errors, Queue full",
        "q10_problem_types": "Channel down, Depth alert",
        "q11_monitoring_status": "Built-in IBM MQ Explorer only",
        "q12_business_impact": "Significant",
        "q13_annual_outage_count": 3.0,
        "q14_duration_text": "1-2 hours",
        "q15_hourly_cost_override": 75000.0,
        "q16_config_management_method": "Manual scripts",
        "q17_audit_frequency": "Quarterly",
        "q18_audit_effort": "1-2 days per audit",
        "q19_documentation_effort": "Manual wiki pages",
        "q20_annual_labor_rate": 200000.0,
        "q21_annual_mq_spend": 850000.0,
        "q22_migration_plans": "Hybrid cloud AWS integration",
        "raw_responses": {
            "q06_selected_label": "Weekly (approx 50/year)",
            "q07_selected_label": "1-4 hours per incident",
        },
    }

    save_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses", json=responses_payload
    )
    assert save_res.status_code == 200
    saved = save_res.json()
    assert saved["q01_company_name"] == "Pinnacle Health Systems"
    assert float(saved["q04_weekly_admin_hours"]) == 15.0
    assert saved["q06_frequency_text"] == "Weekly"
    assert saved["q07_labor_hours_text"] == "1-4 hours"
    assert float(saved["q15_hourly_cost_override"]) == 75000.0
    assert float(saved["q20_annual_labor_rate"]) == 200000.0
    assert float(saved["q21_annual_mq_spend"]) == 850000.0
    assert saved["raw_responses"]["q06_selected_label"] == "Weekly (approx 50/year)"

    # 3. Verify Assessment Status transitioned to IN_PROGRESS
    ass_detail = await client.get(f"/api/v1/assessments/{assessment_id}")
    assert ass_detail.status_code == 200
    assert ass_detail.json()["status"] == "IN_PROGRESS"
    assert ass_detail.json()["response"]["q06_frequency_text"] == "Weekly"

    # 4. Update partial response
    partial_update = {"q04_weekly_admin_hours": 20.0, "q06_frequency_text": "Daily"}
    update_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses", json=partial_update
    )
    assert update_res.status_code == 200
    updated_resp = update_res.json()
    assert float(updated_resp["q04_weekly_admin_hours"]) == 20.0
    assert updated_resp["q06_frequency_text"] == "Daily"
    # Preserves unchanged fields
    assert updated_resp["q07_labor_hours_text"] == "1-4 hours"
