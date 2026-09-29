import asyncio
import ipaddress
import logging
import time
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple

from fastapi import Depends, Request

from app.api.deps import get_current_tenant_id, get_current_user_optional
from app.config import settings
from app.core.errors import RateLimitExceededError
from app.models.user import User

logger = logging.getLogger("app.security")


class BaseRateLimiter(ABC):
    """
    Abstract Base Class for Rate Limiting.
    Allows swappable storage engines (In-Memory sliding window vs distributed Redis).
    """

    @abstractmethod
    async def check_rate_limit(
        self, key: str, limit: int, window_seconds: int = 60
    ) -> Tuple[bool, int, int]:
        """
        Evaluate rate limit for a key.
        Returns:
            Tuple[is_limited (bool), remaining_quota (int), retry_after_seconds (int)]
        """
        pass

    @abstractmethod
    def reset(self) -> None:
        """Reset all rate limit counters (used in testing and maintenance)."""
        pass


class InMemorySlidingWindowRateLimiter(BaseRateLimiter):
    """
    Process-local in-memory sliding window rate limiter.
    Maintains a list of request timestamps per key within the active time window.
    Thread-safe and asyncio-safe via asyncio.Lock.
    """

    def __init__(self):
        self._buckets: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()

    async def check_rate_limit(
        self, key: str, limit: int, window_seconds: int = 60
    ) -> Tuple[bool, int, int]:
        now = time.time()
        window_start = now - window_seconds

        async with self._lock:
            # Prune all expired keys whose timestamps have rolled off completely
            expired_keys = [
                k for k, ts in self._buckets.items()
                if not any(t > window_start for t in ts)
            ]
            for k in expired_keys:
                del self._buckets[k]

            # Retrieve timestamps list for this key
            timestamps = self._buckets.get(key, [])

            # Prune timestamps older than the sliding window start
            valid_timestamps = [t for t in timestamps if t > window_start]

            if len(valid_timestamps) >= limit:
                # Limit exceeded: calculate seconds until earliest request rolls off
                earliest = valid_timestamps[0]
                retry_after = max(1, int(earliest + window_seconds - now + 0.999))
                self._buckets[key] = valid_timestamps
                return True, 0, retry_after

            # Within limit: record current timestamp
            valid_timestamps.append(now)
            self._buckets[key] = valid_timestamps
            remaining = limit - len(valid_timestamps)
            return False, remaining, 0

    async def prune_expired(self, window_seconds: int = 60) -> int:
        """Explicitly prune expired buckets and delete empty keys. Returns number of pruned keys."""
        now = time.time()
        window_start = now - window_seconds
        async with self._lock:
            expired_keys = [
                k for k, ts in self._buckets.items()
                if not any(t > window_start for t in ts)
            ]
            for k in expired_keys:
                del self._buckets[k]
            return len(expired_keys)

    def reset(self) -> None:
        self._buckets.clear()


# Default singleton instance of the in-memory rate limiter
limiter = InMemorySlidingWindowRateLimiter()


def is_ip_in_trusted_proxies(ip_str: str, trusted_proxies: List[str]) -> bool:
    """Checks if an IP address string falls within any configured trusted proxy network."""
    try:
        ip_obj = ipaddress.ip_address(ip_str.strip())
    except ValueError:
        return False

    for proxy_net_str in trusted_proxies:
        try:
            net = ipaddress.ip_network(proxy_net_str.strip(), strict=False)
            if ip_obj in net:
                return True
        except ValueError:
            continue
    return False


def get_trusted_client_ip(request: Request) -> str:
    """
    Resolves client IP respecting trusted proxy boundaries.
    1. If socket peer (request.client.host) is NOT in settings.TRUSTED_PROXY_IPS,
       X-Forwarded-For is ignored entirely and socket peer IP is returned.
    2. If socket peer IS in settings.TRUSTED_PROXY_IPS, X-Forwarded-For is parsed
       from right to left to locate the first untrusted upstream client address.
    """
    peer_ip = request.client.host if request.client else "unknown"
    if peer_ip == "unknown":
        return "unknown"

    # Check if direct peer is trusted
    if not is_ip_in_trusted_proxies(peer_ip, settings.TRUSTED_PROXY_IPS):
        return peer_ip

    # Peer is trusted: inspect X-Forwarded-For
    xff = request.headers.get("X-Forwarded-For") or request.headers.get("x-forwarded-for")
    if not xff:
        return peer_ip

    # Split comma-separated list and traverse right-to-left
    raw_ips = [ip.strip() for ip in xff.split(",") if ip.strip()]
    for raw_ip in reversed(raw_ips):
        try:
            ip_obj = ipaddress.ip_address(raw_ip)
        except ValueError:
            # Skip unparseable garbage IP entries safely
            continue

        # Return first untrusted IP found
        if not is_ip_in_trusted_proxies(str(ip_obj), settings.TRUSTED_PROXY_IPS):
            return str(ip_obj)

    # If all IPs in X-Forwarded-For are trusted proxies, return peer_ip
    return peer_ip


async def rate_limit_login(request: Request) -> None:
    """
    Pre-lookup rate limiting dependency for POST /auth/login.
    Enforces maximum 5 attempts per minute per resolved client IP.
    Applies to all login attempts (successful or failed).
    """
    if not settings.RATE_LIMIT_ENABLED:
        return

    client_ip = get_trusted_client_ip(request)
    key = f"auth:login:ip:{client_ip}"
    limit = settings.RATE_LIMIT_LOGIN_PER_MINUTE

    is_limited, remaining, retry_after = await limiter.check_rate_limit(
        key=key, limit=limit, window_seconds=60
    )

    if is_limited:
        logger.warning(
            f"Rate limit exceeded on login for IP {client_ip}. Retry after {retry_after}s."
        )
        raise RateLimitExceededError(
            message=f"Rate limit exceeded. Too many login attempts. Please retry in {retry_after} seconds.",
            retry_after_seconds=retry_after,
            limit=limit,
            window_seconds=60,
        )


async def rate_limit_calculation(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    tenant_id: str = Depends(get_current_tenant_id),
) -> None:
    """
    Rate limiting dependency for POST /assessments/{id}/calculate.
    Enforces maximum calculations per minute per authenticated user and tenant.
    Key is derived strictly from verified JWT claims (or fallback tenant/IP).
    """
    if not settings.RATE_LIMIT_ENABLED:
        return

    if current_user:
        # Strictly derive key from authenticated JWT claims
        key = f"calc:tenant:{current_user.tenant_id}:user:{current_user.id}"
    else:
        client_ip = get_trusted_client_ip(request)
        key = f"calc:tenant:{tenant_id}:ip:{client_ip}"

    limit = settings.RATE_LIMIT_CALCULATION_PER_MINUTE

    is_limited, remaining, retry_after = await limiter.check_rate_limit(
        key=key, limit=limit, window_seconds=60
    )

    if is_limited:
        logger.warning(
            f"Rate limit exceeded on calculation for key {key}. Retry after {retry_after}s."
        )
        raise RateLimitExceededError(
            message=f"Calculation rate limit exceeded. Please retry in {retry_after} seconds.",
            retry_after_seconds=retry_after,
            limit=limit,
            window_seconds=60,
        )


async def rate_limit_forgot_password(request: Request) -> None:
    """
    Rate limiting dependency for POST /auth/forgot-password.
    Enforces maximum 5 attempts per minute per resolved client IP to prevent abuse/enumeration.
    """
    if not settings.RATE_LIMIT_ENABLED:
        return

    client_ip = get_trusted_client_ip(request)
    key = f"auth:forgot-password:ip:{client_ip}"
    limit = settings.RATE_LIMIT_LOGIN_PER_MINUTE

    is_limited, remaining, retry_after = await limiter.check_rate_limit(
        key=key, limit=limit, window_seconds=60
    )

    if is_limited:
        logger.warning(
            f"Rate limit exceeded on forgot-password for IP {client_ip}. Retry after {retry_after}s."
        )
        raise RateLimitExceededError(
            message=f"Rate limit exceeded. Too many password reset requests. Please retry in {retry_after} seconds.",
            retry_after_seconds=retry_after,
            limit=limit,
            window_seconds=60,
        )


async def rate_limit_credential_redemption(request: Request) -> None:
    """
    Rate limiting dependency for POST /auth/accept-invitation and POST /auth/reset-password.
    Enforces maximum 10 attempts per minute per resolved client IP to protect against token brute forcing.
    """
    if not settings.RATE_LIMIT_ENABLED:
        return

    client_ip = get_trusted_client_ip(request)
    key = f"auth:redemption:ip:{client_ip}"
    limit = 10

    is_limited, remaining, retry_after = await limiter.check_rate_limit(
        key=key, limit=limit, window_seconds=60
    )

    if is_limited:
        logger.warning(
            f"Rate limit exceeded on credential redemption for IP {client_ip}. Retry after {retry_after}s."
        )
        raise RateLimitExceededError(
            message=f"Rate limit exceeded. Too many redemption attempts. Please retry in {retry_after} seconds.",
            retry_after_seconds=retry_after,
            limit=limit,
            window_seconds=60,
        )


