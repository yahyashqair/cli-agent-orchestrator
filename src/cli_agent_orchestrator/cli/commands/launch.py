"""Launch command for CLI Agent Orchestrator CLI."""

import os
import shutil
import subprocess

import click
import requests

from cli_agent_orchestrator.cli.commands.validate import validate_profile
from cli_agent_orchestrator.constants import (
    API_BASE_URL,
    DEFAULT_PROVIDER,
    PROVIDERS,
    SERVER_HOST,
    SERVER_PORT,
)
from cli_agent_orchestrator.services import agent_config_service
from cli_agent_orchestrator.utils.agent_profiles import load_agent_profile
from cli_agent_orchestrator.utils.mcp_config import validate_provider_available


def _pre_launch_check(provider: str, agent_profile: str, enforce: bool = False) -> bool:
    """Run health checks before launching agent.

    Args:
        provider: Provider name to check
        agent_profile: Agent profile name to validate

    Returns:
        bool: True if checks pass or enforcement disabled, False otherwise
    """
    checks_passed = True

    # Check 1: Server is running
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=2)
        if response.status_code == 200:
            click.echo("✅ CAO server is running")
        else:
            click.echo("❌ CAO server returned unexpected status")
            checks_passed = False
    except:
        click.echo("⚠️ CAO server is not running")
        click.echo("   Start it with: cao-server (warning only)")
        if enforce:
            checks_passed = False

    # Check 2: Agent profile exists and is valid
    try:
        profile = load_agent_profile(agent_profile)
        errors = validate_profile(profile)
        if errors:
            click.echo(f"❌ Agent profile has {len(errors)} error(s):")
            for error in errors:
                click.echo(f"   • {error}")
            checks_passed = False
        else:
            click.echo(f"✅ Agent profile '{agent_profile}' is valid")
    except FileNotFoundError:
        click.echo(f"⚠️ Agent profile '{agent_profile}' not found")
        click.echo(f"   Install it with: cao install {agent_profile} (warning only)")
        if enforce:
            checks_passed = False
    except Exception as e:
        click.echo(f"⚠️ Failed to load agent profile: {e}")
        if enforce:
            checks_passed = False

    # Check 3: Provider is available
    is_available, error_msg = validate_provider_available(provider)
    if is_available:
        click.echo(f"✅ Provider '{provider}' is available")
    else:
        click.echo(f"⚠️ Provider '{provider}' is not available")
        click.echo(f"   {error_msg}")
        if enforce:
            checks_passed = False

    return checks_passed


@click.command()
@click.option("--agents", required=True, help="Agent profile to launch")
@click.option("--session-name", help="Name of the session (default: auto-generated)")
@click.option("--headless", is_flag=True, help="Launch in detached mode")
@click.option(
    "--provider",
    default=None,
    help="Provider to use. Defaults to the agent profile provider or q_cli. Available: q_cli, claude_code, codex_cli, copilot_cli, opencode",
)
@click.option("--skip-checks", is_flag=True, help="Skip pre-launch health checks")
def launch(agents, session_name, headless, provider, skip_checks):
    """Launch cao session with specified agent profile."""
    try:
        selected_provider = provider
        profile_provider = None
        configured_provider = None

        if not selected_provider:
            try:
                configured_provider = agent_config_service.get_provider_for_profile(agents)
            except Exception as exc:
                click.echo(
                    f"⚠️ Failed to load provider override for '{agents}': {exc}. Using defaults."
                )
                configured_provider = None

            try:
                profile = load_agent_profile(agents)
                profile_provider = getattr(profile, "provider", None)
            except Exception:
                profile_provider = None

            selected_provider = agent_config_service.resolve_provider(
                agents,
                profile_provider=profile_provider,
                inherited_provider=None,
                configured_provider=configured_provider,
            )

            if configured_provider:
                click.echo(f"Using provider '{selected_provider}' (saved override)")
            elif profile_provider:
                click.echo(f"Using provider '{selected_provider}' (defined in agent profile)")
            else:
                click.echo(f"Using provider '{selected_provider}' (default)")

        # Validate provider after defaults are resolved
        if selected_provider not in PROVIDERS:
            raise click.ClickException(
                f"Invalid provider '{selected_provider}'. Available providers: {', '.join(PROVIDERS)}"
            )

        # Run pre-launch health checks unless skipped
        enforce_checks = os.environ.get("CAO_ENFORCE_PRECHECKS") == "1"
        if not skip_checks:
            click.echo("⏳ Running pre-launch checks...\n")
            checks_ok = _pre_launch_check(selected_provider, agents, enforce=enforce_checks)
            if enforce_checks and not checks_ok:
                click.echo("\n❌ Pre-launch checks failed")
                click.echo(
                    "Fix the issues above, set CAO_ENFORCE_PRECHECKS=0, or use --skip-checks to bypass"
                )
                return 1
            click.echo()  # Blank line

        # Call API to create session
        url = f"http://{SERVER_HOST}:{SERVER_PORT}/sessions"
        params = {
            "provider": selected_provider,
            "agent_profile": agents,
            "working_directory": os.getcwd(),  # Pass current working directory
        }
        if session_name:
            params["session_name"] = session_name

        response = requests.post(url, params=params)
        response.raise_for_status()

        terminal = response.json()

        click.echo(f"Session created: {terminal['session_name']}")
        click.echo(f"Terminal created: {terminal['name']}")

        # Attach to tmux session unless headless
        if not headless:
            subprocess.run(["tmux", "attach-session", "-t", terminal["session_name"]])

    except requests.exceptions.RequestException as e:
        raise click.ClickException(f"Failed to connect to cao-server: {str(e)}")
    except Exception as e:
        raise click.ClickException(str(e))
