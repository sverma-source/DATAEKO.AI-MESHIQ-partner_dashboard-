from enum import Enum
from typing import Dict, List, Set


class Role(str, Enum):
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    PARTNER_ADMIN = "PARTNER_ADMIN"
    CONSULTANT = "CONSULTANT"
    CUSTOMER_ADMIN = "CUSTOMER_ADMIN"
    CUSTOMER_USER = "CUSTOMER_USER"


class Permission(str, Enum):
    # Customer permissions
    CUSTOMER_CREATE = "customer:create"
    CUSTOMER_READ = "customer:read"
    CUSTOMER_UPDATE = "customer:update"
    
    # Assessment permissions
    ASSESSMENT_CREATE = "assessment:create"
    ASSESSMENT_READ = "assessment:read"
    ASSESSMENT_UPDATE = "assessment:update"
    ASSESSMENT_CALCULATE = "assessment:calculate"
    
    # Calculation Snapshot & Report permissions
    SNAPSHOT_READ = "snapshot:read"
    REPORT_GENERATE = "report:generate"
    
    # Audit permissions
    AUDIT_READ = "audit:read"
    
    # Tenant administration
    TENANT_MANAGE = "tenant:manage"


ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.PLATFORM_ADMIN: {
        Permission.CUSTOMER_CREATE,
        Permission.CUSTOMER_READ,
        Permission.CUSTOMER_UPDATE,
        Permission.ASSESSMENT_CREATE,
        Permission.ASSESSMENT_READ,
        Permission.ASSESSMENT_UPDATE,
        Permission.ASSESSMENT_CALCULATE,
        Permission.SNAPSHOT_READ,
        Permission.REPORT_GENERATE,
        Permission.AUDIT_READ,
        Permission.TENANT_MANAGE,
    },
    Role.PARTNER_ADMIN: {
        Permission.CUSTOMER_CREATE,
        Permission.CUSTOMER_READ,
        Permission.CUSTOMER_UPDATE,
        Permission.ASSESSMENT_CREATE,
        Permission.ASSESSMENT_READ,
        Permission.ASSESSMENT_UPDATE,
        Permission.ASSESSMENT_CALCULATE,
        Permission.SNAPSHOT_READ,
        Permission.REPORT_GENERATE,
        Permission.AUDIT_READ,
        Permission.TENANT_MANAGE,
    },
    Role.CONSULTANT: {
        Permission.CUSTOMER_CREATE,
        Permission.CUSTOMER_READ,
        Permission.CUSTOMER_UPDATE,
        Permission.ASSESSMENT_CREATE,
        Permission.ASSESSMENT_READ,
        Permission.ASSESSMENT_UPDATE,
        Permission.ASSESSMENT_CALCULATE,
        Permission.SNAPSHOT_READ,
        Permission.REPORT_GENERATE,
        Permission.AUDIT_READ,
    },
    Role.CUSTOMER_ADMIN: {
        Permission.CUSTOMER_READ,
        Permission.CUSTOMER_UPDATE,
        Permission.ASSESSMENT_CREATE,
        Permission.ASSESSMENT_READ,
        Permission.ASSESSMENT_UPDATE,
        Permission.ASSESSMENT_CALCULATE,
        Permission.SNAPSHOT_READ,
        Permission.REPORT_GENERATE,
        Permission.TENANT_MANAGE,
    },
    Role.CUSTOMER_USER: {
        Permission.CUSTOMER_READ,
        Permission.ASSESSMENT_CREATE,
        Permission.ASSESSMENT_READ,
        Permission.ASSESSMENT_UPDATE,
    },
}


def has_permission(user_role: str, required_permission: Permission) -> bool:
    """Check if a given role possesses the required action permission."""
    try:
        role_enum = Role(user_role)
        perms = ROLE_PERMISSIONS.get(role_enum, set())
        return required_permission in perms
    except ValueError:
        return False
