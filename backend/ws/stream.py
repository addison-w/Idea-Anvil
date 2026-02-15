"""WebSocket streaming for real-time agent communication."""

from __future__ import annotations

import json
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage

from agents.graph import build_graph
from agents.state import PRDConfig

router = APIRouter()


def classify_stream_event(event: dict, namespace: tuple) -> dict | None:
    """Classify a LangGraph stream event into a typed WS message."""
    if not event:
        return None

    for node_name, node_data in event.items():
        if node_name == "__interrupt__":
            return None

        messages = node_data.get("messages", [])
        phase = node_data.get("phase")
        research_results = node_data.get("research_results", [])

        result = {"node": node_name}

        if messages:
            last_msg = messages[-1]
            if hasattr(last_msg, "content") and last_msg.content:
                result["type"] = "token"
                result["content"] = last_msg.content

        if phase:
            result["type"] = "node_update"
            result["data"] = {"phase": phase}

        if research_results:
            result["type"] = "custom"
            result["event"] = "search_result"
            result["data"] = {
                "source": research_results[0].source if research_results else "",
                "count": sum(len(r.items) for r in research_results),
            }

        if "type" in result:
            return result

    return None


@router.websocket("/session/{thread_id}")
async def websocket_stream(websocket: WebSocket, thread_id: str):
    """WebSocket endpoint for streaming agent events."""
    await websocket.accept()

    try:
        # Wait for initial message or use existing session
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

        # Stream events
        async for event in graph.astream(input_state, config, stream_mode="updates"):
            ws_event = classify_stream_event(event, ())
            if ws_event:
                await websocket.send_json(ws_event)

            # Check for interrupts
            state = graph.get_state(config)
            if state.next:
                # Interrupted — send interrupt event
                current_values = state.values
                interrupt_type = current_values.get("pending_interrupt", "unknown")
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

                # Wait for user resume
                resume_data = await websocket.receive_json()
                resume_value = resume_data.get("value", "")

                # Update state with user input
                if interrupt_type == "clarification":
                    graph.update_state(
                        config,
                        {
                            "messages": [HumanMessage(content=resume_value)],
                        },
                    )
                elif interrupt_type == "prd_review":
                    graph.update_state(
                        config,
                        {
                            "user_feedback": resume_value,
                        },
                    )

                # Resume streaming
                async for event in graph.astream(None, config, stream_mode="updates"):
                    ws_event = classify_stream_event(event, ())
                    if ws_event:
                        await websocket.send_json(ws_event)

        # Send completion
        final_state = graph.get_state(config)
        await websocket.send_json(
            {
                "type": "complete",
                "prd": final_state.values.get("prd_draft", ""),
            }
        )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
        await websocket.close()
