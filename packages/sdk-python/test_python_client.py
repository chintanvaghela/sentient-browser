"""
Verification test for Sentient Browser Python SDK.
"""

import sys
import os

# Add local path to sys.path so we can test without pip install
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sentient import SyncSentientClient


def test_python_client():
    print("Connecting to Sentient Browser at ws://127.0.0.1:9222...")
    with SyncSentientClient("ws://127.0.0.1:9222") as client:
        print("Connected! Creating new page context...")
        page = client.new_page()
        print(f"Page created with ID: {page.id}")

        print("Navigating to https://news.ycombinator.com...")
        snapshot = page.goto("https://news.ycombinator.com")
        print(f"Navigation success! Title: '{snapshot.title}'")
        print(f"Pruned nodes: {snapshot.pruned_nodes_count}, Interactive: {snapshot.interactive_count}")

        assert len(snapshot.nodes) > 0, "Expected snapshot to have nodes"
        assert snapshot.interactive_count > 0, "Expected interactive elements"

        print("\nTesting Autonomous Planner...")
        result = page.solve("Find features of Time Tracker", max_steps=4)
        print(f"Autonomous Solve Success: {result.success}")
        print(f"Answer: {result.answer}")
        print(f"Steps taken: {result.steps_count} in {result.duration_ms}ms")

        assert result.success is True, "Expected goal to succeed"

        print("\nTesting Rollback...")
        diff = page.rollback()
        print(f"Rollback diff operations: {diff.operations_count}")

        print("\nTesting Page Summary extraction...")
        summary = page.get_summary()
        print(f"Summary title: {summary.get('title')}, headings count: {len(summary.get('headings', []))}")

        print("\nClosing page...")
        page.close()
        print("Test completed successfully!")


if __name__ == "__main__":
    test_python_client()
