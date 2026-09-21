from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class SemanticNode:
    id: str
    role: str
    tag: str
    clickable: bool = False
    text: Optional[str] = None
    placeholder: Optional[str] = None
    href: Optional[str] = None
    checked: Optional[bool] = None
    disabled: Optional[bool] = None
    value: Optional[str] = None
    aria_label: Optional[str] = None
    parent_id: Optional[str] = None
    children: List[SemanticNode] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> SemanticNode:
        children = [cls.from_dict(c) for c in data.get("children", [])]
        return cls(
            id=data.get("id", ""),
            role=data.get("role", "generic"),
            tag=data.get("tag", "div"),
            clickable=data.get("clickable", False),
            text=data.get("text"),
            placeholder=data.get("placeholder"),
            href=data.get("href"),
            checked=data.get("checked"),
            disabled=data.get("disabled"),
            value=data.get("value"),
            aria_label=data.get("ariaLabel"),
            parent_id=data.get("parentId"),
            children=children,
        )


@dataclass
class SemanticSnapshot:
    url: str
    title: str
    nodes: List[SemanticNode]
    interactive_count: int
    raw_nodes_count: int
    pruned_nodes_count: int
    timestamp: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> SemanticSnapshot:
        nodes = [SemanticNode.from_dict(n) for n in data.get("nodes", [])]
        return cls(
            url=data.get("url", ""),
            title=data.get("title", ""),
            nodes=nodes,
            interactive_count=data.get("interactiveCount", 0),
            raw_nodes_count=data.get("rawNodesCount", 0),
            pruned_nodes_count=data.get("prunedNodesCount", 0),
            timestamp=data.get("timestamp", 0),
        )


@dataclass
class StateDiff:
    operations_count: int
    added: List[SemanticNode] = field(default_factory=list)
    removed: List[str] = field(default_factory=list)
    updated: List[Dict[str, Any]] = field(default_factory=list)
    compact: str = ""

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> StateDiff:
        added = [SemanticNode.from_dict(n) for n in data.get("added", [])]
        return cls(
            operations_count=data.get("operationsCount", 0),
            added=added,
            removed=data.get("removed", []),
            updated=data.get("updated", []),
            compact=data.get("compact", ""),
        )


@dataclass
class PlannerStep:
    step_number: int
    action: Dict[str, Any]
    diff_summary: Optional[str] = None
    timestamp: int = 0

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PlannerStep:
        return cls(
            step_number=data.get("stepNumber", 0),
            action=data.get("action", {}),
            diff_summary=data.get("diffSummary"),
            timestamp=data.get("timestamp", 0),
        )


@dataclass
class PlannerResult:
    success: bool
    goal: str
    answer: Optional[str] = None
    steps_count: int = 0
    steps: List[PlannerStep] = field(default_factory=list)
    duration_ms: int = 0
    error: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PlannerResult:
        steps = [PlannerStep.from_dict(s) for s in data.get("steps", [])]
        return cls(
            success=data.get("success", False),
            goal=data.get("goal", ""),
            answer=data.get("answer"),
            steps_count=data.get("stepsCount", 0),
            steps=steps,
            duration_ms=data.get("durationMs", 0),
            error=data.get("error"),
        )
