"""Validate agent profile configuration."""

import os
import shutil
from typing import List

import click

from cli_agent_orchestrator.constants import PROVIDERS
from cli_agent_orchestrator.utils.agent_profiles import load_agent_profile


def validate_profile(profile) -> List[str]:
    """Validate agent profile and return list of errors.

    Args:
        profile: AgentProfile instance to validate

    Returns:
        List[str]: List of validation error messages
    """
    errors = []

    # Check MCP server commands
    if hasattr(profile, "mcpServers") and profile.mcpServers:
        for name, config in profile.mcpServers.items():
            cmd = config.get("command")
            if cmd:
                if not shutil.which(cmd):
                    errors.append(
                        f"MCP server '{name}': command '{cmd}' not found in PATH. "
                        f"Install it or check your PATH."
                    )
            else:
                # Command is auto-detected, so no validation needed
                pass

    # Check provider
    if hasattr(profile, "provider") and profile.provider:
        if profile.provider not in PROVIDERS:
            errors.append(
                f"Invalid provider: {profile.provider}. " f"Valid providers: {', '.join(PROVIDERS)}"
            )

    # Check required environment variables
    if hasattr(profile, "mcpServers") and profile.mcpServers:
        for server_config in profile.mcpServers.values():
            if not isinstance(server_config, dict):
                continue

            env_vars = server_config.get("env") or {}
            for key, value in env_vars.items():
                # Check for unexpanded variables
                if "${" in str(value):
                    var_name = value.split("${")[1].split("}")[0]
                    if not os.environ.get(var_name):
                        errors.append(
                            f"Environment variable ${var_name} is not set. "
                            f"Export it before launching the agent."
                        )

    return errors


@click.command()
@click.argument("agent_name")
def validate(agent_name: str):
    """Validate an agent profile configuration.

    Checks:
    - Profile exists and is parsable
    - MCP server commands are available
    - Provider is valid
    - Environment variables are set
    - No syntax errors

    Example:
        cao validate code_supervisor
        cao validate my-custom-agent
    """
    try:
        profile = load_agent_profile(agent_name)
        errors = validate_profile(profile)

        if not errors:
            click.echo(f"✅ Profile '{agent_name}' is valid")

            # Show detected configuration
            if hasattr(profile, "provider") and profile.provider:
                click.echo(f"  Provider: {profile.provider}")

            if hasattr(profile, "mcpServers") and profile.mcpServers:
                click.echo(f"  MCP Servers: {len(profile.mcpServers)}")
                for name in profile.mcpServers:
                    config = profile.mcpServers[name]
                    if config.get("command"):
                        click.echo(f"    • {name}: {config.get('command')}")
                    else:
                        click.echo(f"    • {name}: (auto-detected)")

            return 0
        else:
            click.echo(f"❌ Profile '{agent_name}' has {len(errors)} error(s):")
            for error in errors:
                click.echo(f"  • {error}")
            click.echo()
            click.echo("💡 Suggestions:")
            click.echo("  • Install missing commands: 'uv tool install .'")
            click.echo("  • Check your PATH includes required tools")
            click.echo("  • Set missing environment variables")
            return 1

    except FileNotFoundError:
        click.echo(f"❌ Profile '{agent_name}' not found")
        click.echo()
        click.echo("💡 To install a built-in agent:")
        click.echo(f"  cao install {agent_name}")
        click.echo()
        click.echo("💡 To install from a file:")
        click.echo(f"  cao install ./{agent_name}.md")
        return 1
    except Exception as e:
        click.echo(f"❌ Validation failed: {e}")
        click.echo()
        click.echo("💡 Check that the profile file is valid YAML with proper frontmatter")
        return 1
