import re
from typing import Tuple, Dict, Any

def parse_intent(text: str) -> Tuple[str, Dict[str, Any]]:
    """
    Parses natural language text into a structured intent.
    Returns a tuple of (intent_name, extracted_entities).
    """
    text = text.strip()
    
    # 1. Pending / Under Verification Degrees
    if re.search(r'\b(pending|under verification|not verified yet|verifying)\b', text, re.IGNORECASE):
        return "get_pending_degrees", {}
        
    # 2. Minted / Approved Degrees
    if re.search(r'\b(minted|approved|issued|my certificates|my verified degrees)\b', text, re.IGNORECASE):
        return "get_minted_degrees", {}
        
    # 3. Specific Degree Status
    if re.search(r'\b(status of|is my degree verified|check degree)\b', text, re.IGNORECASE):
        return "get_status", {}
        
    # 4. All Degrees
    if re.search(r'\b(all degrees|my degrees|show degrees)\b', text, re.IGNORECASE):
        return "get_all_degrees", {}
        
    # 5. Last Login / Account info
    if re.search(r'\b(last login|account status|my info)\b', text, re.IGNORECASE):
        return "get_account_info", {}
        
    # 6. Get Degree PDF
    if re.search(r'\b(get my degree pdf|download my degree|send my pdf|my degree pdf|get pdf|download pdf)\b', text, re.IGNORECASE):
        return "get_degree_pdf", {}

    # 7. Start / Help
    # Pattern: /start TOKEN (Keep case for token!)
    start_match = re.search(r'/start\s+([a-zA-Z0-9_-]+)', text, re.IGNORECASE)
    if start_match:
        return "start_with_token", {"token": start_match.group(1)}

    lower_text = text.lower()
    if lower_text.startswith("/start") or lower_text.startswith("/help") or lower_text.startswith("start") or lower_text.startswith("help"):
        return "start", {}

    # 8. Get Telegram ID
    if text.startswith("/myid") or "what is my id" in text:
        return "get_my_id", {}

    # 9. Link Account Magic Command
    # Pattern: /link user@example.com
    link_match = re.search(r'/link\s+([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', text, re.IGNORECASE)
    if link_match:
        return "link_account", {"email": link_match.group(1)}
        
    # Default fallback
    return "help", {}
