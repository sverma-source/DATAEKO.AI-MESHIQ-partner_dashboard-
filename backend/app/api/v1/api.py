from fastapi import APIRouter
from app.api.v1 import assessments, auth, audit, customers, health

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["Assessments"])
api_router.include_router(audit.router, prefix="/audit-events", tags=["Audit"])
