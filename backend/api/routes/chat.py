from fastapi import APIRouter
from pydantic import BaseModel

from backend.agents.base_agent import call_llm

router = APIRouter()

SYSTEM_PROMPT = """You are a helpful explainer for The Daily Briefing, a news platform designed to help young people understand the world.

You are given context about a specific news story. The user will ask questions about it.

RULES:
1. Explain things simply — as if talking to a smart 16-year-old who wants to understand the world.
2. Use Australian English (organised, colour, centre).
3. NO JARGON without explanation. If you use a term, explain it immediately.
4. Be concise: aim for 2-4 paragraphs max unless the question requires more.
5. When explaining financial concepts (hedge funds, bonds, tariffs), use real-world analogies.
6. When explaining geopolitics (alliances, conflicts, sanctions), explain the "why" behind actions.
7. Connect things back to the reader: "This affects you because..."
8. Be factual and balanced. Present multiple perspectives where relevant.
9. If you don't know something, say so rather than guessing.
10. End with a "Now you know" one-liner that captures the key takeaway."""


class ChatRequest(BaseModel):
    question: str
    story_context: str
    story_title: str
    history: list[dict] = []


class ChatResponse(BaseModel):
    answer: str


@router.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """Answer a user question about a news story."""
    # Build conversation context
    messages_text = f"STORY CONTEXT:\n{req.story_context}\n\n"

    # Include recent history
    for msg in req.history[-6:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        messages_text += f"{'User' if role == 'user' else 'Assistant'}: {content}\n"

    messages_text += f"\nUser's new question: {req.question}"

    response = call_llm(
        system_prompt=SYSTEM_PROMPT,
        user_message=messages_text,
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        temperature=0.3,
        agent_name="chat",
    )

    if not response:
        return ChatResponse(
            answer="Sorry, I couldn't generate a response. Please try again."
        )

    return ChatResponse(answer=response)
