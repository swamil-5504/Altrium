from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, Depends
from app.core.config import settings
from app.services.telegram_bot import service as tg_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{settings.API_V1_STR}/telegram", tags=["telegram"])

@router.post("/webhook/{token}")
async def telegram_webhook(token: str, request: Request, background_tasks: BackgroundTasks):
    """
    Receive incoming Telegram messages.
    The path includes the bot token to ensure only Telegram can trigger this endpoint.
    """
    if token != settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")
        
    try:
        payload = await request.json()
        # Process the update in the background so we can respond to Telegram quickly
        background_tasks.add_task(tg_service.process_update, payload)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {e}")
        return {"status": "error"}

from pydantic import BaseModel
from app.api.deps.auth import get_current_user
from app.models.models import User

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_with_bot(
    body: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Direct chat endpoint for the frontend widget.
    Allows users to interact with the bot logic without using Telegram.
    """
    from app.services.telegram_bot import service as tg_service
    response = await tg_service.get_web_chat_response(current_user, body.message)
    return {"response": response}

import secrets
import os

@router.get("/link-token")
async def get_telegram_link(current_user: User = Depends(get_current_user)):
    """
    Generates a unique token and returns the Telegram deep link.
    """
    token = secrets.token_urlsafe(16)
    
    # Clear existing ID to allow a fresh connection
    current_user.telegram_id = None
    current_user.telegram_link_token = token
    await current_user.save()
    
    from app.core.config import settings
    bot_name = os.getenv("TELEGRAM_BOT_USERNAME", "Altrium_Notification_Bot")
    
    link = f"tg://resolve?domain={bot_name}&start={token}"
    return {"link": link, "token": token}
