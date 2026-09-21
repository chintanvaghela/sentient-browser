from __future__ import annotations
import asyncio
import json
from typing import Any, Callable, Dict, List, Optional
import websockets
from websockets.client import WebSocketClientProtocol

from .exceptions import SentientConnectionError, SentientRPCError
from .models import PlannerResult, SemanticSnapshot, StateDiff


class RemoteSentientPage:
    """Represents a browser page session managed by Sentient Browser runtime."""

    def __init__(self, page_id: str, client: SentientClient):
        self.page_id = page_id
        self.client = client

    @property
    def id(self) -> str:
        return self.page_id

    async def goto(self, url: str, timeout_ms: int = 30000) -> SemanticSnapshot:
        """Navigates to URL and waits for multi-signal network/DOM settlement."""
        res = await self.client.call("goto", {"pageId": self.page_id, "url": url, "timeoutMs": timeout_ms})
        return SemanticSnapshot.from_dict(res)

    async def get_semantic_dom(self) -> SemanticSnapshot:
        """Captures a pruned Semantic DOM snapshot (<10% of raw DOM tokens)."""
        res = await self.client.call("getSemanticDOM", {"pageId": self.page_id})
        return SemanticSnapshot.from_dict(res)

    async def get_diff(self) -> StateDiff:
        """Gets state difference between the current DOM and previous action."""
        res = await self.client.call("getDiff", {"pageId": self.page_id})
        return StateDiff.from_dict(res)

    async def click(self, target: str, button: str = "left", click_count: int = 1) -> StateDiff:
        """Dispatches native CDP click event to stable ID target and returns resulting diff."""
        res = await self.client.call(
            "click",
            {
                "pageId": self.page_id,
                "target": target,
                "options": {"button": button, "clickCount": click_count},
            },
        )
        return StateDiff.from_dict(res.get("diff", {}))

    async def fill(self, target: str, text: str, clear_first: bool = True) -> StateDiff:
        """Fills input with text via native CDP typing events."""
        res = await self.client.call(
            "fill",
            {
                "pageId": self.page_id,
                "target": target,
                "text": text,
                "options": {"clearFirst": clear_first},
            },
        )
        return StateDiff.from_dict(res.get("diff", {}))

    async def hover(self, target: str) -> StateDiff:
        """Dispatches native CDP hover event to target element."""
        res = await self.client.call("hover", {"pageId": self.page_id, "target": target})
        return StateDiff.from_dict(res.get("diff", {}))

    async def scroll(self, direction: str = "down", amount_px: int = 500) -> StateDiff:
        """Scrolls page window or target container."""
        res = await self.client.call(
            "scroll",
            {
                "pageId": self.page_id,
                "options": {"direction": direction, "amountPx": amount_px},
            },
        )
        return StateDiff.from_dict(res.get("diff", {}))

    async def rollback(self) -> StateDiff:
        """Reverts the last intent action via inverse operation (Undo)."""
        res = await self.client.call("rollback", {"pageId": self.page_id})
        return StateDiff.from_dict(res.get("diff", {}))

    async def solve(
        self,
        goal: str,
        max_steps: int = 8,
        timeout_ms: int = 30000,
    ) -> PlannerResult:
        """Autonomous Goal Planner: inspects DOM, plans actions, and resolves objective."""
        res = await self.client.call(
            "solve",
            {
                "pageId": self.page_id,
                "goal": {
                    "goal": goal,
                    "maxSteps": max_steps,
                    "timeoutMs": timeout_ms,
                },
            },
        )
        return PlannerResult.from_dict(res)

    async def get_summary(self) -> Dict[str, Any]:
        """Returns structured page summary (title, meta, headings, top links)."""
        return await self.client.call("getSummary", {"pageId": self.page_id})

    async def extract_links(self) -> List[Dict[str, str]]:
        """Extracts cleaned HTTP/HTTPS hyperlinks from the page."""
        return await self.client.call("extractLinks", {"pageId": self.page_id})

    async def extract_table(self, selector: Optional[str] = None) -> List[Dict[str, str]]:
        """Extracts table rows and headers into structured JSON records."""
        return await self.client.call("extractTable", {"pageId": self.page_id, "selector": selector})

    async def extract_list(self, selector: Optional[str] = None) -> List[str]:
        """Extracts list items into clean string arrays."""
        return await self.client.call("extractList", {"pageId": self.page_id, "selector": selector})

    async def screenshot(self, format: str = "jpeg", quality: int = 80) -> str:
        """Captures a base64 encoded screenshot of the page viewport."""
        res = await self.client.call("screenshot", {"pageId": self.page_id, "options": {"format": format, "quality": quality}})
        return res.get("data", "")

    async def remember(self, key: str, value: Any) -> None:
        """Stores a key-value record in page memory."""
        await self.client.call("remember", {"pageId": self.page_id, "key": key, "value": value})

    async def recall(self, key: str) -> Optional[Any]:
        """Recalls a stored value from page memory."""
        res = await self.client.call("recall", {"pageId": self.page_id, "key": key})
        return res.get("value")

    async def clear_memory(self) -> None:
        """Clears all stored values in page memory."""
        await self.client.call("clearMemory", {"pageId": self.page_id})

    async def close(self) -> None:
        """Closes the current browser page session."""
        await self.client.call("closePage", {"pageId": self.page_id})


class SentientClient:
    """Async WebSocket client communicating with Sentient Browser Runtime."""

    def __init__(self, url: str = "ws://127.0.0.1:9222"):
        self.url = url
        self.ws: Optional[WebSocketClientProtocol] = None
        self._req_counter = 0
        self._pending_requests: Dict[int, asyncio.Future] = {}
        self._receive_task: Optional[asyncio.Task] = None
        self._diff_subscribers: List[Callable[[StateDiff, str], None]] = []
        self._agent_step_subscribers: List[Callable[[Dict[str, Any], str], None]] = []

    @classmethod
    async def connect(cls, url: str = "ws://127.0.0.1:9222") -> SentientClient:
        client = cls(url=url)
        await client._init()
        return client

    async def _init(self) -> None:
        try:
            self.ws = await websockets.connect(self.url)
        except Exception as err:
            raise SentientConnectionError(f"Failed to connect to Sentient Browser at {self.url}: {err}") from err

        self._receive_task = asyncio.create_task(self._listener_loop())

    async def _listener_loop(self) -> None:
        try:
            assert self.ws is not None
            async for raw_message in self.ws:
                try:
                    msg = json.loads(raw_message)
                except Exception:
                    continue

                # Handle JSON-RPC responses
                msg_id = msg.get("id")
                if msg_id is not None and msg_id in self._pending_requests:
                    future = self._pending_requests.pop(msg_id)
                    if "error" in msg:
                        err = msg["error"]
                        future.set_exception(SentientRPCError(err.get("code", -1), err.get("message", "Unknown error")))
                    else:
                        future.set_result(msg.get("result"))
                    continue

                # Handle notifications/events
                method = msg.get("method")
                params = msg.get("params", {})
                if method == "event.domDiff":
                    diff = StateDiff.from_dict(params.get("diff", {}))
                    for sub in self._diff_subscribers:
                        try:
                            sub(diff, params.get("pageId", ""))
                        except Exception:
                            pass
                elif method == "event.agentStep":
                    step = params.get("step", {})
                    for sub in self._agent_step_subscribers:
                        try:
                            sub(step, params.get("pageId", ""))
                        except Exception:
                            pass

        except (asyncio.CancelledError, websockets.ConnectionClosed):
            pass

    async def call(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        if self.ws is None or self.ws.closed:
            raise SentientConnectionError("WebSocket connection is closed.")

        self._req_counter += 1
        req_id = self._req_counter
        payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params or {},
        }

        loop = asyncio.get_running_loop()
        future = loop.create_future()
        self._pending_requests[req_id] = future

        await self.ws.send(json.dumps(payload))
        return await future

    async def new_page(self) -> RemoteSentientPage:
        """Opens a new browser page context."""
        res = await self.call("newPage")
        return RemoteSentientPage(res["pageId"], self)

    def on_diff(self, callback: Callable[[StateDiff, str], None]) -> None:
        """Subscribes to real-time DOM diff events."""
        self._diff_subscribers.append(callback)

    def on_agent_step(self, callback: Callable[[Dict[str, Any], str], None]) -> None:
        """Subscribes to autonomous agent step progression events."""
        self._agent_step_subscribers.append(callback)

    async def close(self) -> None:
        """Closes the WebSocket connection."""
        if self._receive_task:
            self._receive_task.cancel()
        if self.ws and not self.ws.closed:
            await self.ws.close()
