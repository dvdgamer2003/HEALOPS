"""Pydantic models for the agent results schema."""

from pydantic import BaseModel, Field
from typing import Optional


class FixEntry(BaseModel):
    """A single fix applied by the AI agent."""
    file: str = Field(..., description="Relative file path that was fixed")
    bug_type: str = Field(..., description="Category: LINTING | SYNTAX | LOGIC | TYPE_ERROR | IMPORT | INDENTATION | CONFIG | GENERATED_TEST")
    line_number: int = Field(..., description="Line number where the bug was detected (0 for generated/config)")
    commit_message: str = Field(..., description="Git commit message for this fix")
    status: str = Field(default="Fixed", description="Fix status: Fixed | Failed | Generated")


class CICDEntry(BaseModel):
    """A single CI/CD iteration record."""
    iteration: int = Field(..., description="Iteration number (1-3)")
    status: str = Field(..., description="PASSED | FAILED | SKIPPED")
    timestamp: str = Field(default="", description="ISO 8601 timestamp")
    message: str = Field(default="", description="Optional context message")


class ScoreBreakdown(BaseModel):
    """Score calculation breakdown."""
    base: int = Field(default=100, description="Base score")
    speed_bonus: int = Field(default=0, description="+10 if total time < 5 minutes")
    efficiency_penalty: int = Field(default=0, description="-2 per commit over 20")
    final: int = Field(default=100, description="Final computed score")

    def calculate(self, time_taken_seconds: float, commit_count: int) -> "ScoreBreakdown":
        """Recalculate score based on time and commits."""
        self.base = 100
        self.speed_bonus = 10 if time_taken_seconds < 300 else 0
        extra_commits = max(0, commit_count - 20)
        self.efficiency_penalty = -(extra_commits * 2)
        self.final = self.base + self.speed_bonus + self.efficiency_penalty
        return self


class AgentResults(BaseModel):
    """Complete results payload returned when the agent finishes."""
    run_id: str
    commit_message: str
    repo_url: str
    branch: str
    branch_url: str = ""
    total_failures: int = 0
    total_fixes: int = 0
    ci_cd_status: str = "PENDING"
    iterations_used: int = 0
    commit_count: int = 0
    time_taken_seconds: float = 0.0
    score: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    fixes: list[FixEntry] = Field(default_factory=list)
    ci_cd_timeline: list[CICDEntry] = Field(default_factory=list)
