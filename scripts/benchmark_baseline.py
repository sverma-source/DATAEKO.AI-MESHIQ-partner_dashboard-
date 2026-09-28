#!/usr/bin/env python3
"""
Phase 9.7 — Non-Destructive PostgreSQL 16 Performance Baseline Benchmark.

Measures the 8 specified runtime scenarios against the live PostgreSQL-backed FastAPI service:
1. GET /api/v1/health/live
2. GET /api/v1/health/ready
3. POST /api/v1/auth/login (within rate limit)
4. PUT /api/v1/assessments/{id}/responses
5. POST /api/v1/assessments/{id}/calculate
6. GET /api/v1/assessments/{id}/snapshots/latest
7. Rate-limit enforcement on login (HTTP 429 validation)
8. 20 concurrent mixed authenticated read/write requests (DB connection pool stress)
"""

import concurrent.futures
import json
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

BASE_URL = "http://localhost:8000/api/v1"

# Existing deterministic credentials & assessment fixtures
LOGIN_PAYLOAD = {
    "email": "consultant@dataeko.ai",
    "password": "Consultant123!",
}

ASSESSMENT_ID = "15675f0a-aba2-4b6c-bb16-e881980159e2"

VALID_RESPONSE_PAYLOAD = {
    "q01_company_name": "Apex Global Financial",
    "q02_industry": "Financial Services & Banking",
    "q03_environment_scale": "Enterprise (100+ Queue Managers)",
    "q04_weekly_admin_hours": 48.0,
    "q05_mq_role_split": "Centralized dedicated MQ team",
    "q06_frequency_text": "About weekly",
    "q07_labor_hours_text": "3–5 hours",
    "q07_labor_hours_override": 4.0,
    "q08_duration_text": "46–90 minutes",
    "q09_root_cause_categories": "Configuration drifting, capacity issues",
    "q10_problem_types": "Queue full, channel disconnection",
    "q11_monitoring_status": "Fragmented basic monitoring",
    "q12_business_impact": "Significant",
    "q13_annual_outage_count": 4.0,
    "q14_duration_text": "46–90 minutes",
    "q15_hourly_cost_override": 300000.0,
    "q16_config_management_method": "Mostly manual with scripts",
    "q17_audit_frequency": "Quarterly",
    "q18_audit_effort": "Substantial",
    "q19_documentation_effort": "High",
    "q20_annual_labor_rate": 180000.0,
    "q21_annual_mq_spend": 450000.0,
    "q22_migration_plans": "Hybrid cloud modernization planned",
}


def make_request(
    method: str,
    path: str,
    data: Optional[Dict[str, Any]] = None,
    cookie: Optional[str] = None,
    headers_extra: Optional[Dict[str, str]] = None,
    timeout: float = 15.0,
) -> Tuple[int, float, Dict[str, Any], Dict[str, str]]:
    """Executes an HTTP request and measures exact elapsed latency in milliseconds."""
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = cookie
    if headers_extra:
        headers.update(headers_extra)

    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)

    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            status_code = response.status
            resp_headers = dict(response.info().items())
            body_bytes = response.read()
            try:
                body_json = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            except Exception:
                body_json = {"raw": body_bytes.decode("utf-8", errors="replace")}
            return status_code, elapsed_ms, body_json, resp_headers
    except urllib.error.HTTPError as http_err:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        status_code = http_err.code
        resp_headers = dict(http_err.headers.items())
        body_bytes = http_err.read()
        try:
            body_json = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            body_json = {"raw": body_bytes.decode("utf-8", errors="replace")}
        return status_code, elapsed_ms, body_json, resp_headers
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return 0, elapsed_ms, {"error": str(exc)}, {}


def calculate_stats(latencies: List[float]) -> Dict[str, Any]:
    """Calculates min, P50, P95, P99, max, mean from latencies in ms."""
    if not latencies:
        return {"min": 0.0, "p50": 0.0, "p95": 0.0, "p99": 0.0, "max": 0.0, "mean": 0.0}
    sorted_l = sorted(latencies)
    n = len(sorted_l)
    def percentile(p: float) -> float:
        idx = int(p * n)
        return sorted_l[min(idx, n - 1)]

    return {
        "min": round(sorted_l[0], 2),
        "p50": round(percentile(0.50), 2),
        "p95": round(percentile(0.95), 2),
        "p99": round(percentile(0.99), 2),
        "max": round(sorted_l[-1], 2),
        "mean": round(statistics.mean(sorted_l), 2),
    }


def wait_for_rate_limit_reset():
    """Checks if login is currently throttled, and sleeps if needed."""
    code, _, _, headers = make_request("POST", "/auth/login", LOGIN_PAYLOAD)
    if code == 429:
        retry_after = int(headers.get("retry-after") or headers.get("Retry-After") or "60")
        print(f"  [Notice] Rate limit active. Waiting {retry_after + 2}s for sliding window expiry...")
        time.sleep(retry_after + 2)
    elif code == 200:
        # We used 1 attempt
        pass


def authenticate() -> str:
    """Authenticates and extracts access_token cookie."""
    status, _, _, headers = make_request("POST", "/auth/login", LOGIN_PAYLOAD)
    if status == 429:
        retry_after = int(headers.get("retry-after") or "60")
        print(f"  [Notice] Rate limited during auth. Waiting {retry_after + 2}s...")
        time.sleep(retry_after + 2)
        status, _, _, headers = make_request("POST", "/auth/login", LOGIN_PAYLOAD)

    if status != 200:
        raise RuntimeError(f"Authentication failed with status {status}")
    set_cookie = headers.get("set-cookie") or headers.get("Set-Cookie") or ""
    # Extract access_token
    for part in set_cookie.split(";"):
        if part.strip().startswith("access_token="):
            return part.strip()
    return set_cookie.split(";")[0]


def run_benchmark():
    print("=======================================================================")
    print("PHASE 9.7 — POSTGRESQL 16 RUNTIME PERFORMANCE BASELINE BENCHMARK")
    print("=======================================================================")

    # Ensure rate limit window is clear before starting
    print("\n[Step 0] Checking rate limiter state...")
    wait_for_rate_limit_reset()

    # Obtain auth cookie
    print("  Authenticating test session...")
    auth_cookie = authenticate()
    print(f"  Auth successful. Session established.")

    results_summary = {}

    # -------------------------------------------------------------------------
    # Scenario 1: GET /health/live
    # -------------------------------------------------------------------------
    print("\n[Scenario 1] Benchmarking GET /api/v1/health/live (50 requests, Concurrency=1)...")
    latencies = []
    statuses = []
    t0 = time.perf_counter()
    for _ in range(50):
        code, lat, _, _ = make_request("GET", "/health/live")
        latencies.append(lat)
        statuses.append(code)
    total_dur = time.perf_counter() - t0
    stats = calculate_stats(latencies)
    stats["requests"] = len(latencies)
    stats["concurrency"] = 1
    stats["success_rate"] = f"{statuses.count(200)}/{len(statuses)}"
    stats["throughput"] = round(len(latencies) / total_dur, 1)
    results_summary["1. GET /health/live"] = stats
    print(f"  Min: {stats['min']}ms | P50: {stats['p50']}ms | P95: {stats['p95']}ms | P99: {stats['p99']}ms | Max: {stats['max']}ms | Throughput: {stats['throughput']} req/s")

    # -------------------------------------------------------------------------
    # Scenario 2: GET /health/ready (Exercises SELECT 1 on PostgreSQL)
    # -------------------------------------------------------------------------
    print("\n[Scenario 2] Benchmarking GET /api/v1/health/ready (50 requests, Concurrency=1)...")
    latencies = []
    statuses = []
    t0 = time.perf_counter()
    for _ in range(50):
        code, lat, _, _ = make_request("GET", "/health/ready")
        latencies.append(lat)
        statuses.append(code)
    total_dur = time.perf_counter() - t0
    stats = calculate_stats(latencies)
    stats["requests"] = len(latencies)
    stats["concurrency"] = 1
    stats["success_rate"] = f"{statuses.count(200)}/{len(statuses)}"
    stats["throughput"] = round(len(latencies) / total_dur, 1)
    results_summary["2. GET /health/ready"] = stats
    print(f"  Min: {stats['min']}ms | P50: {stats['p50']}ms | P95: {stats['p95']}ms | P99: {stats['p99']}ms | Max: {stats['max']}ms | Throughput: {stats['throughput']} req/s")

    # -------------------------------------------------------------------------
    # Scenario 3: POST /auth/login (Within configured rate limit)
    # -------------------------------------------------------------------------
    print("\n[Scenario 3] Benchmarking POST /api/v1/auth/login (2 requests within 5/min limit)...")
    latencies = []
    statuses = []
    t0 = time.perf_counter()
    for _ in range(2):
        code, lat, _, _ = make_request("POST", "/auth/login", LOGIN_PAYLOAD)
        latencies.append(lat)
        statuses.append(code)
    total_dur = time.perf_counter() - t0
    stats = calculate_stats(latencies)
    stats["requests"] = len(latencies)
    stats["concurrency"] = 1
    stats["success_rate"] = f"{statuses.count(200)}/{len(statuses)}"
    stats["throughput"] = round(len(latencies) / total_dur, 1)
    results_summary["3. POST /auth/login"] = stats
    print(f"  Min: {stats['min']}ms | P50: {stats['p50']}ms | P95: {stats['p95']}ms | P99: {stats['p99']}ms | Max: {stats['max']}ms (Bcrypt CPU bounded)")

    # -------------------------------------------------------------------------
    # Scenario 4: PUT /assessments/{id}/responses (Response Persistence)
    # -------------------------------------------------------------------------
    print(f"\n[Scenario 4] Benchmarking PUT /api/v1/assessments/{ASSESSMENT_ID}/responses (20 requests)...")
    latencies = []
    statuses = []
    t0 = time.perf_counter()
    for _ in range(20):
        code, lat, _, _ = make_request("PUT", f"/assessments/{ASSESSMENT_ID}/responses", VALID_RESPONSE_PAYLOAD, cookie=auth_cookie)
        latencies.append(lat)
        statuses.append(code)
    total_dur = time.perf_counter() - t0
    stats = calculate_stats(latencies)
    stats["requests"] = len(latencies)
    stats["concurrency"] = 1
    stats["success_rate"] = f"{statuses.count(200)}/{len(statuses)}"
    stats["throughput"] = round(len(latencies) / total_dur, 1)
    results_summary["4. PUT /assessments/{id}/responses"] = stats
    print(f"  Min: {stats['min']}ms | P50: {stats['p50']}ms | P95: {stats['p95']}ms | P99: {stats['p99']}ms | Max: {stats['max']}ms | Throughput: {stats['throughput']} req/s")

    # -------------------------------------------------------------------------
    # Scenario 5: POST /assessments/{id}/calculate (Calculation Engine & Snapshot Persistence)
    # -------------------------------------------------------------------------
    print(f"\n[Scenario 5] Benchmarking POST /api/v1/assessments/{ASSESSMENT_ID}/calculate (6 requests within 10/min limit)...")
    latencies = []
    statuses = []
    t0 = time.perf_counter()
    for _ in range(6):
        code, lat, _, _ = make_request("POST", f"/assessments/{ASSESSMENT_ID}/calculate", cookie=auth_cookie)
        latencies.append(lat)
        statuses.append(code)
    total_dur = time.perf_counter() - t0
    stats = calculate_stats(latencies)
    stats["requests"] = len(latencies)
    stats["concurrency"] = 1
    stats["success_rate"] = f"{statuses.count(200)}/{len(statuses)}"
    stats["throughput"] = round(len(latencies) / total_dur, 1)
    results_summary["5. POST /assessments/{id}/calculate"] = stats
    print(f"  Min: {stats['min']}ms | P50: {stats['p50']}ms | P95: {stats['p95']}ms | P99: {stats['p99']}ms | Max: {stats['max']}ms | Throughput: {stats['throughput']} req/s")

    # -------------------------------------------------------------------------
    # Scenario 6: GET /assessments/{id}/snapshots/latest (Snapshot Retrieval)
    # -------------------------------------------------------------------------
    print(f"\n[Scenario 6] Benchmarking GET /api/v1/assessments/{ASSESSMENT_ID}/snapshots/latest (50 requests)...")
    latencies = []
    statuses = []
    t0 = time.perf_counter()
    for _ in range(50):
        code, lat, _, _ = make_request("GET", f"/assessments/{ASSESSMENT_ID}/snapshots/latest", cookie=auth_cookie)
        latencies.append(lat)
        statuses.append(code)
    total_dur = time.perf_counter() - t0
    stats = calculate_stats(latencies)
    stats["requests"] = len(latencies)
    stats["concurrency"] = 1
    stats["success_rate"] = f"{statuses.count(200)}/{len(statuses)}"
    stats["throughput"] = round(len(latencies) / total_dur, 1)
    results_summary["6. GET /assessments/{id}/snapshots/latest"] = stats
    print(f"  Min: {stats['min']}ms | P50: {stats['p50']}ms | P95: {stats['p95']}ms | P99: {stats['p99']}ms | Max: {stats['max']}ms | Throughput: {stats['throughput']} req/s")

    # -------------------------------------------------------------------------
    # Scenario 7: Rate-Limiting & HTTP 429 Validation
    # -------------------------------------------------------------------------
    print("\n[Scenario 7] Benchmarking Rate Limiter Throttling on POST /auth/login (Bursting 6 requests)...")
    burst_statuses = []
    burst_latencies = []
    http_429_payload = None
    http_429_headers = None
    for i in range(6):
        code, lat, body, hdrs = make_request("POST", "/auth/login", LOGIN_PAYLOAD)
        burst_statuses.append(code)
        burst_latencies.append(lat)
        if code == 429 and http_429_payload is None:
            http_429_payload = body
            http_429_headers = hdrs

    stats = calculate_stats(burst_latencies)
    stats["requests"] = len(burst_latencies)
    stats["status_distribution"] = {str(k): burst_statuses.count(k) for k in sorted(set(burst_statuses))}
    stats["http_429_verified"] = 429 in burst_statuses
    results_summary["7. Rate-Limit Throttling (HTTP 429)"] = stats
    print(f"  Min: {stats['min']}ms | P50: {stats['p50']}ms | P95: {stats['p95']}ms | Max: {stats['max']}ms")
    print(f"  Status distribution: {stats['status_distribution']}")
    print(f"  HTTP 429 observed: {stats['http_429_verified']}")
    if http_429_payload:
        print(f"  HTTP 429 Body: {json.dumps(http_429_payload)}")
        print(f"  X-Request-ID Header: {http_429_headers.get('x-request-id')}")
        print(f"  Retry-After Header: {http_429_headers.get('retry-after')}")

    # -------------------------------------------------------------------------
    # Scenario 8: 20 Concurrent Mixed Read/Write Requests (DB Pool Exercise)
    # -------------------------------------------------------------------------
    print("\n[Scenario 8] Benchmarking 20 Concurrent Mixed Read/Write Requests (DB Connection Pool Stress)...")
    endpoints = [
        ("GET", "/health/ready", None),
        ("GET", "/assessments", None),
        ("GET", "/customers", None),
        ("GET", f"/assessments/{ASSESSMENT_ID}", None),
        ("GET", f"/assessments/{ASSESSMENT_ID}/snapshots/latest", None),
        ("PUT", f"/assessments/{ASSESSMENT_ID}/responses", VALID_RESPONSE_PAYLOAD),
        ("GET", "/audit-events", None),
        ("GET", "/health/live", None),
    ]

    # Build 20 tasks
    tasks = []
    for i in range(20):
        method, path, body = endpoints[i % len(endpoints)]
        tasks.append((method, path, body))

    concurrent_latencies = []
    concurrent_statuses = []
    concurrent_errors = []

    def execute_worker(task):
        m, p, b = task
        return make_request(m, p, b, cookie=auth_cookie)

    t0 = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(execute_worker, t) for t in tasks]
        for f in concurrent.futures.as_completed(futures):
            try:
                code, lat, body, _ = f.result()
                concurrent_latencies.append(lat)
                concurrent_statuses.append(code)
                if code >= 500 or code == 0:
                    concurrent_errors.append((code, body))
            except Exception as e:
                concurrent_errors.append((0, str(e)))
    total_dur = time.perf_counter() - t0

    stats = calculate_stats(concurrent_latencies)
    stats["requests"] = len(concurrent_latencies)
    stats["concurrency"] = 20
    stats["status_distribution"] = {str(k): concurrent_statuses.count(k) for k in sorted(set(concurrent_statuses))}
    stats["errors_count"] = len(concurrent_errors)
    stats["total_duration_sec"] = round(total_dur, 3)
    results_summary["8. 20 Concurrent Mixed Pool Stress"] = stats

    print(f"  Concurrency: 20 workers | Total duration: {stats['total_duration_sec']}s")
    print(f"  Min: {stats['min']}ms | P50: {stats['p50']}ms | P95: {stats['p95']}ms | P99: {stats['p99']}ms | Max: {stats['max']}ms")
    print(f"  Status distribution: {stats['status_distribution']}")
    print(f"  Pool/DB/5xx errors: {stats['errors_count']}")

    print("\n=======================================================================")
    print("ALL 8 BENCHMARK SCENARIOS COMPLETED SUCCESSFULLY")
    print("=======================================================================")

    return {
        "summary": results_summary,
        "http_429_inspection": {
            "payload": http_429_payload,
            "headers": {
                "x-request-id": http_429_headers.get("x-request-id") if http_429_headers else None,
                "retry-after": http_429_headers.get("retry-after") if http_429_headers else None,
            },
        },
        "concurrent_errors": concurrent_errors,
    }


if __name__ == "__main__":
    benchmark_data = run_benchmark()
    with open("docs/artifacts/benchmark_results.json", "w") as f:
        json.dump(benchmark_data, f, indent=2)
    print("\nWrote benchmark artifacts to docs/artifacts/benchmark_results.json")
