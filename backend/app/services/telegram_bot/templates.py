"""
Telegram Notification Templates.
Clean, messenger-style text formatting.
"""

def student_registration_msg(name: str) -> str:
    return (
        f"<b>🎓 Welcome to Altrium, {name}!</b>\n\n"
        f"Your account has been created successfully. "
        f"You can now upload your documents for verification."
    )

def admin_verified_msg(name: str, college: str) -> str:
    return (
        f"<b>✅ Account Verified</b>\n\n"
        f"Hello {name},\n"
        f"Your administrator account for <b>{college}</b> has been approved. "
        f"You can now manage student degree submissions."
    )

def degree_approved_msg(student_name: str, degree_title: str, tx_hash: str | None) -> str:
    msg = (
        f"<b>🎉 Degree Approved!</b>\n\n"
        f"Congratulations {student_name},\n"
        f"Your degree <b>{degree_title}</b> has been verified and minted on the blockchain."
    )
    if tx_hash:
        msg += f"\n\n🔗 <a href='https://sepolia.etherscan.io/tx/{tx_hash}'>View on Etherscan</a>"
    return msg

def degree_rejected_msg(student_name: str, degree_title: str, reason: str = None) -> str:
    reason_text = f"\n\n<b>Reason:</b>\n{reason}" if reason else ""
    return (
        f"<b>❌ Degree Verification Update</b>\n\n"
        f"Hello {student_name},\n"
        f"We regret to inform you that your request for <b>{degree_title}</b> was not approved at this time.{reason_text}\n\n"
        f"Please check your dashboard for details or contact your university admin."
    )

def degree_acknowledged_msg(student_name: str, degree_title: str) -> str:
    return (
        f"<b>📄 Document Received</b>\n\n"
        f"Hello {student_name},\n"
        f"Your university admin has received your degree document for <b>{degree_title}</b>. "
        f"It has been moved to the <b>Pending</b> queue for final on-chain verification and minting."
    )

def pending_reminder_msg(name: str, count: int, college: str) -> str:
    return (
        f"<b>📋 Pending Actions</b>\n\n"
        f"Hello {name},\n"
        f"There are <b>{count}</b> pending degree submissions at <b>{college}</b> waiting for your review."
    )
