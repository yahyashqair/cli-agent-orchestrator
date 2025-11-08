"""MCP server models."""

import json
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class HandoffResult(BaseModel):
    """Result of a handoff operation with enhanced debugging."""

    success: bool = Field(description="Whether the handoff was successful")
    message: str = Field(description="A message describing the result of the handoff")
    output: Optional[str] = Field(None, description="The output from the target agent")
    terminal_id: Optional[str] = Field(None, description="The terminal ID used for the handoff")
    error_code: Optional[str] = Field(None, description="Machine-readable error code")
    suggestion: Optional[str] = Field(None, description="Actionable suggestion to fix the issue")
    debug_info: Dict[str, Any] = Field(
        default_factory=dict, description="Additional debugging information"
    )

    def __str__(self) -> str:
        """User-friendly string representation."""
        if self.success:
            return f"✅ {self.message}"

        result = f"❌ {self.message}"
        if self.suggestion:
            result += f"\n💡 Suggestion: {self.suggestion}"
        if self.debug_info:
            result += f"\n🔍 Debug: {json.dumps(self.debug_info, indent=2)}"
        return result
