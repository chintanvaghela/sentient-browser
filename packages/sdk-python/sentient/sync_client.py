from __future__ import annotations
import asyncio
import threading
from typing import Any, Dict, List, Optional

from .client import RemoteSentientPage, SentientClient
from .models import PlannerResult, SemanticSnapshot, StateDiff


class SyncRemoteSentientPage:
    """Synchronous wrapper around RemoteSentientPage for blocking Python scripts."""

    def __init__(self, async_page: RemoteSentientPage, loop: asyncio.AbstractEventLoop):
        self._async_page = async_page
        self._loop = loop

    def _run(self, coro):
        fut = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return fut.result()

    @property
    def id(self) -> str:
        return self._async_page.id

    def goto(self, url: str, timeout_ms: int = 30000) -> SemanticSnapshot:
        return self._run(self._async_page.goto(url, timeout_ms))

    def get_semantic_dom(self) -> SemanticSnapshot:
        return self._run(self._async_page.get_semantic_dom())

    def get_diff(self) -> StateDiff:
        return self._run(self._async_page.get_diff())

    def click(self, target: str, button: str = "left", click_count: int = 1) -> StateDiff:
        return self._run(self._async_page.click(target, button, click_count))

    def fill(self, target: str, text: str, clear_first: bool = True) -> StateDiff:
        return self._run(self._async_page.fill(target, text, clear_first))

    def hover(self, target: str) -> StateDiff:
        return self._run(self._async_page.hover(target))

    def scroll(self, direction: str = "down", amount_px: int = 500) -> StateDiff:
        return self._run(self._async_page.scroll(direction, amount_px))

    def rollback(self) -> StateDiff:
        return self._run(self._async_page.rollback())

    def solve(self, goal: str, max_steps: int = 8, timeout_ms: int = 30000) -> PlannerResult:
        return self._run(self._async_page.solve(goal, max_steps, timeout_ms))

    def get_summary(self) -> Dict[str, Any]:
        return self._run(self._async_page.get_summary())

    def extract_links(self) -> List[Dict[str, str]]:
        return self._run(self._async_page.extract_links())

    def extract_table(self, selector: Optional[str] = None) -> List[Dict[str, str]]:
        return self._run(self._async_page.extract_table(selector))

    def extract_list(self, selector: Optional[str] = None) -> List[str]:
        return self._run(self._async_page.extract_list(selector))

    def screenshot(self, format: str = "jpeg", quality: int = 80) -> str:
        return self._run(self._async_page.screenshot(format=format, quality=quality))

    def remember(self, key: str, value: Any) -> None:
        return self._run(self._async_page.remember(key, value))

    def recall(self, key: str) -> Optional[Any]:
        return self._run(self._async_page.recall(key))

    def clear_memory(self) -> None:
        return self._run(self._async_page.clear_memory())

    def close(self) -> None:
        return self._run(self._async_page.close())


class SyncSentientClient:
    """Synchronous client for Sentient Browser runtime."""

    def __init__(self, url: str = "ws://127.0.0.1:9222"):
        self.url = url
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

        fut = asyncio.run_coroutine_threadsafe(SentientClient.connect(self.url), self._loop)
        self._async_client = fut.result()

    def _run_loop(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()

    def new_page(self) -> SyncRemoteSentientPage:
        fut = asyncio.run_coroutine_threadsafe(self._async_client.new_page(), self._loop)
        page = fut.result()
        return SyncRemoteSentientPage(page, self._loop)

    def close(self) -> None:
        fut = asyncio.run_coroutine_threadsafe(self._async_client.close(), self._loop)
        fut.result()
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._thread.join(timeout=2.0)

    def __enter__(self) -> SyncSentientClient:
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()
