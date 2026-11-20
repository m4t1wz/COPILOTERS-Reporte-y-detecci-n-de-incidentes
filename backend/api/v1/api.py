"""Enrutador maestro v1 (docs/03. backend.md §1)."""
from fastapi import APIRouter, Depends

from core.security import enforce_global_rate_limit

from api.v1.endpoints import admin, auth, incidents, reports, users

api_router = APIRouter(dependencies=[Depends(enforce_global_rate_limit)])
api_router.include_router(auth.router)
api_router.include_router(incidents.router)
api_router.include_router(reports.router)
api_router.include_router(admin.router)
api_router.include_router(users.router)
