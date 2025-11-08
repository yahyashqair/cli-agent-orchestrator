"""Service helpers for managing agent provider overrides."""

import logging
from typing import Dict, List, Optional

from cli_agent_orchestrator.clients.database import (
    delete_agent_provider_config,
    get_agent_provider_config,
    list_agent_provider_configs,
    set_agent_provider_config,
)
from cli_agent_orchestrator.constants import DEFAULT_PROVIDER, PROVIDERS

logger = logging.getLogger(__name__)


def list_provider_configs() -> List[Dict[str, str]]:
    """Return all configured agent provider overrides."""
    return list_agent_provider_configs()


def get_provider_for_profile(agent_profile: str) -> Optional[str]:
    """Return configured provider override for an agent profile if present."""
    config = get_agent_provider_config(agent_profile)
    return config["provider"] if config else None


def set_provider_for_profile(agent_profile: str, provider: str) -> Dict[str, str]:
    """Upsert a provider override for the specified agent profile."""
    if provider not in PROVIDERS:
        raise ValueError(f"Invalid provider '{provider}'. Must be one of: {', '.join(PROVIDERS)}")
    logger.info("Setting provider override for %s -> %s", agent_profile, provider)
    return set_agent_provider_config(agent_profile, provider)


def clear_provider_for_profile(agent_profile: str) -> bool:
    """Remove any provider override for the specified agent profile."""
    logger.info("Clearing provider override for %s", agent_profile)
    return delete_agent_provider_config(agent_profile)


def resolve_provider(
    agent_profile: str,
    profile_provider: Optional[str] = None,
    inherited_provider: Optional[str] = None,
    configured_provider: Optional[str] = None,
) -> str:
    """Resolve the effective provider following the configured precedence rules."""
    override = (
        configured_provider
        if configured_provider is not None
        else get_provider_for_profile(agent_profile)
    )
    if override:
        return override
    if profile_provider:
        return profile_provider
    if inherited_provider:
        return inherited_provider
    return DEFAULT_PROVIDER
