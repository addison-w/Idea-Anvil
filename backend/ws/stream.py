"""WebSocket streaming for real-time agent communication."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage

from agents.config import strip_think
from agents.graph import build_graph
from agents.state import PRDConfig

logger = logging.getLogger(__name__)
router = APIRouter()

KEEPALIVE_INTERVAL = 15


def classify_stream_event(event: dict, namespace: tuple) -> list[dict]:
    """Classify a LangGraph stream event into typed WS messages.

    Returns a list because a single graph event can carry both a phase update
    and a token/content payload that the frontend processes independently.
    """
    if not event:
        return []

    results: list[dict] = []

    for node_name, node_data in event.items():
        if node_name == "__interrupt__":
            continue
        if not isinstance(node_data, dict):
            continue

        messages = node_data.get("messages", [])
        phase = node_data.get("phase")
        search_queries = node_data.get("search_queries", [])
        research_results = node_data.get("research_results", [])

        if phase:
            results.append({"type": "node_update", "node": node_name, "data": {"phase": phase}})

        if messages and node_name in ("clarifier", "reviewer"):
            if not phase or phase == "clarifying":
                last_msg = messages[-1]
                if hasattr(last_msg, "content") and last_msg.content:
                    results.append(
                        {
                            "type": "token",
                            "node": node_name,
                            "content": strip_think(last_msg.content),
                        }
                    )

        if search_queries:
            queries_data = []
            for q in search_queries:
                if hasattr(q, "model_dump"):
                    queries_data.append(q.model_dump())
                elif isinstance(q, dict):
                    queries_data.append(q)
            results.append(
                {
                    "type": "custom",
                    "node": node_name,
                    "event": "queries_generated",
                    "data": {"queries": queries_data},
                }
            )

        if research_results:
            for r in research_results:
                source = r.source if hasattr(r, "source") else r.get("source", "")
                query = r.query if hasattr(r, "query") else r.get("query", "")
                items = r.items if hasattr(r, "items") else r.get("items", [])
                results.append(
                    {
                        "type": "custom",
                        "node": node_name,
                        "event": "search_result",
                        "data": {
                            "source": source,
                            "query": query,
                            "count": len(items),
                        },
                    }
                )

    return results


@router.websocket("/session/{thread_id}")
async def websocket_stream(websocket: WebSocket, thread_id: str):
    """WebSocket endpoint for streaming agent events."""
    from backend.api.chat import _sessions

    await websocket.accept()

    keepalive_task = None

    async def keepalive():
        try:
            while True:
                await asyncio.sleep(KEEPALIVE_INTERVAL)
                await websocket.send_json({"type": "ping"})
        except Exception:
            pass

    try:
        keepalive_task = asyncio.create_task(keepalive())

        data = await websocket.receive_json()

        idea = data.get("idea", "")
        depth = data.get("depth", "light")

        graph = build_graph()
        config = {"configurable": {"thread_id": thread_id}}

        # Initial invocation
        input_state = {
            "messages": [HumanMessage(content=idea)],
            "raw_idea": idea,
            "refined_idea": None,
            "clarification_round": 0,
            "search_queries": [],
            "research_results": [],
            "insights": None,
            "prd_config": PRDConfig(depth=depth),
            "prd_draft": None,
            "prd_version": 0,
            "phase": "clarifying",
            "pivot_history": [],
            "pending_interrupt": None,
            "user_feedback": None,
        }

        async def stream_until_interrupt(input_val, cfg):
            logger.info("stream_until_interrupt: input=%s", "initial" if input_val else "resume")
            async for event in graph.astream(input_val, cfg, stream_mode="updates"):
                for ws_event in classify_stream_event(event, ()):
                    logger.info(
                        "ws_event: type=%s node=%s", ws_event.get("type"), ws_event.get("node")
                    )
                    await websocket.send_json(ws_event)
            logger.info("stream_until_interrupt: done")

        await stream_until_interrupt(input_state, config)

        while True:
            state = graph.get_state(config)
            logger.info("graph state: next=%s", state.next)
            if not state.next:
                break

            current_values = state.values
            interrupt_type = current_values.get("pending_interrupt")
            logger.info("interrupt_type=%s, phase=%s", interrupt_type, current_values.get("phase"))

            if not interrupt_type:
                if "reviewer" in state.next:
                    interrupt_type = "prd_review"
                else:
                    logger.info("no interrupt_type and not reviewer, resuming stream...")
                    await stream_until_interrupt(None, config)
                    continue

            logger.info("sending interrupt event: type=%s", interrupt_type)
            await websocket.send_json(
                {
                    "type": "interrupt",
                    "interrupt_type": interrupt_type,
                    "data": {
                        "phase": current_values.get("phase"),
                        "prd_draft": current_values.get("prd_draft"),
                        "prd_version": current_values.get("prd_version", 0),
                    },
                }
            )

            if thread_id in _sessions:
                prd = current_values.get("prd_draft")
                if prd:
                    _sessions[thread_id]["prd_draft"] = prd
                    _sessions[thread_id]["prd_version"] = current_values.get("prd_version", 0)

            logger.info("waiting for resume from client...")
            resume_data = await websocket.receive_json()
            resume_value = resume_data.get("value", "")
            logger.info(
                "received resume: type=%s, value=%s", resume_data.get("type"), resume_value[:80]
            )

            if interrupt_type == "clarification":
                logger.info("updating state with human message for clarification")
                graph.update_state(
                    config,
                    {"messages": [HumanMessage(content=resume_value)]},
                    as_node="clarifier",
                )
            elif interrupt_type == "prd_review":
                logger.info("updating state with user_feedback for prd_review")
                graph.update_state(
                    config,
                    {"user_feedback": resume_value, "pending_interrupt": None},
                    as_node="reviewer",
                )

            logger.info("resuming stream after interrupt...")
            await stream_until_interrupt(None, config)

        final_state = graph.get_state(config)
        prd_draft = final_state.values.get("prd_draft", "")

        if thread_id in _sessions:
            _sessions[thread_id]["prd_draft"] = prd_draft
            _sessions[thread_id]["prd_version"] = final_state.values.get("prd_version", 0)
            _sessions[thread_id]["phase"] = final_state.values.get("phase", "done")

        await websocket.send_json(
            {
                "type": "complete",
                "prd": prd_draft,
            }
        )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("WS session %s error", thread_id)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close()
        except Exception:
            pass
    finally:
        if keepalive_task:
            keepalive_task.cancel()
