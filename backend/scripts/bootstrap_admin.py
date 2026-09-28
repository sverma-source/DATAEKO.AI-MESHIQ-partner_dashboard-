"""
Administrative Bootstrap CLI for DATAEKO × meshIQ Partner Dashboard.

Explicit operator utility to provision initial administrative and consultant accounts
securely without hardcoding credentials in source code or application startup lifecycles.

Usage Examples:
    Interactive (recommended):
        python backend/scripts/bootstrap_admin.py --email admin@enterprise.com --full-name "Enterprise Admin"

    Non-Interactive (CI/CD or automated staging provisioning with env var):
        BOOTSTRAP_ADMIN_PASSWORD="StrongSecurePassword123!" \
        python backend/scripts/bootstrap_admin.py --email admin@enterprise.com --full-name "Enterprise Admin" --non-interactive
"""

import argparse
import asyncio
import getpass
import os
import sys
from typing import Optional

from sqlalchemy import select

from app.api.deps import DEFAULT_TENANT_ID
from app.config import is_placeholder_or_low_entropy_secret
from app.core.database import AsyncSessionLocal, engine
from app.core.rbac import Role
from app.core.security import get_password_hash
from app.models.tenant import Tenant
from app.models.user import User


def parse_args(args: Optional[list] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Explicitly bootstrap an administrative or consultant account in the database."
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Administrator corporate email address.",
    )
    parser.add_argument(
        "--full-name",
        default="Platform Administrator",
        help="Full name of the user (default: 'Platform Administrator').",
    )
    parser.add_argument(
        "--tenant-id",
        default=DEFAULT_TENANT_ID,
        help=f"Target tenant UUID (default: '{DEFAULT_TENANT_ID}').",
    )
    parser.add_argument(
        "--tenant-name",
        default="Primary Organization (DATAEKO / meshIQ)",
        help="Name of tenant if tenant must be created.",
    )
    parser.add_argument(
        "--tenant-slug",
        default="default-org",
        help="Slug of tenant if tenant must be created.",
    )
    parser.add_argument(
        "--role",
        default=Role.PLATFORM_ADMIN.value,
        choices=[r.value for r in Role],
        help="Role to assign to the user (default: PLATFORM_ADMIN).",
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="Read password from BOOTSTRAP_ADMIN_PASSWORD environment variable instead of interactive prompt.",
    )
    return parser.parse_args(args)


INSECURE_BOOTSTRAP_PASSWORDS = {
    "password",
    "password1234",
    "admin12345678",
    "changeme12345",
    "consultant123!",
    "adminpass123!",
    "123456789012",
}


def validate_password_strength(password: str) -> None:
    """Validate password satisfies minimum length and entropy requirements."""
    if not password or len(password) < 12:
        raise ValueError("Password must be at least 12 characters long.")
    if len(set(password)) < 4:
        raise ValueError("Password has insufficient character variety / entropy.")
    if password.strip().lower() in INSECURE_BOOTSTRAP_PASSWORDS:
        raise ValueError("Password is a recognized weak or default placeholder.")


async def bootstrap_user(
    email: str,
    password: str,
    full_name: str,
    role: str,
    tenant_id: str,
    tenant_name: str,
    tenant_slug: str,
) -> User:
    """Creates tenant (if needed) and user in database with hashed password."""
    clean_email = email.strip().lower()
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise ValueError(f"Invalid email address format: '{email}'")

    validate_password_strength(password)

    async with AsyncSessionLocal() as session:
        # 1. Verify user does not already exist
        stmt = select(User).where(User.email == clean_email)
        existing_user = (await session.execute(stmt)).scalar_one_or_none()
        if existing_user:
            raise ValueError(f"User with email '{clean_email}' already exists. Aborting.")

        # 2. Ensure tenant exists or create it
        tenant_stmt = select(Tenant).where(Tenant.id == tenant_id)
        tenant = (await session.execute(tenant_stmt)).scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                id=tenant_id,
                name=tenant_name,
                slug=tenant_slug,
                is_active=True,
            )
            session.add(tenant)
            await session.flush()

        # 3. Create user with hashed password
        hashed_password = get_password_hash(password)
        new_user = User(
            email=clean_email,
            hashed_password=hashed_password,
            full_name=full_name.strip(),
            role=role,
            tenant_id=tenant_id,
            is_active=True,
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        return new_user


async def main_async(args: argparse.Namespace) -> int:
    if args.non_interactive:
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
        if not password:
            print(
                "Error: Non-interactive mode requested but BOOTSTRAP_ADMIN_PASSWORD environment variable is empty or unset.",
                file=sys.stderr,
            )
            return 1
    else:
        try:
            password = getpass.getpass("Enter password for new administrator: ")
            confirm = getpass.getpass("Confirm password: ")
            if password != confirm:
                print("Error: Passwords do not match.", file=sys.stderr)
                return 1
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.", file=sys.stderr)
            return 1

    try:
        user = await bootstrap_user(
            email=args.email,
            password=password,
            full_name=args.full_name,
            role=args.role,
            tenant_id=args.tenant_id,
            tenant_name=args.tenant_name,
            tenant_slug=args.tenant_slug,
        )
        print("=" * 60)
        print("✅ Administrator bootstrap completed successfully!")
        print(f"   User ID:   {user.id}")
        print(f"   Email:     {user.email}")
        print(f"   Full Name: {user.full_name}")
        print(f"   Role:      {user.role}")
        print(f"   Tenant ID: {user.tenant_id}")
        print("=" * 60)
        return 0
    except Exception as exc:
        print(f"❌ Bootstrap failed: {exc}", file=sys.stderr)
        return 1
    finally:
        await engine.dispose()


def main():
    args = parse_args()
    exit_code = asyncio.run(main_async(args))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
