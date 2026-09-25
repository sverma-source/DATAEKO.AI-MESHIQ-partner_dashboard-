from typing import Any, Dict, Optional


class AppError(Exception):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class EntityNotFoundError(AppError):
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            f"{entity_name} with id '{entity_id}' was not found.",
            {"entity": entity_name, "id": str(entity_id)},
        )


class AuthenticationError(AppError):
    """Raised when authentication credentials are missing or invalid (HTTP 401)."""
    def __init__(self, message: str = "Invalid or expired authentication credentials.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)


class PermissionDeniedError(AppError):
    """Raised when an authenticated user lacks required action permissions (HTTP 403)."""
    def __init__(self, message: str = "You do not have permission to perform this action.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)


class TenantMismatchError(AppError):
    """
    Raised on cross-tenant resource access attempts (anti-IDOR).
    Treated as 404 EntityNotFound to prevent resource enumeration and information leakage.
    """
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            f"{entity_name} with id '{entity_id}' was not found.",
            {"entity": entity_name, "id": str(entity_id)},
        )


class ConflictError(AppError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)


class InvalidStateTransitionError(AppError):
    def __init__(self, current_status: str, target_status: str):
        super().__init__(
            f"Cannot transition assessment from '{current_status}' to '{target_status}'.",
            {"current_status": current_status, "target_status": target_status},
        )
