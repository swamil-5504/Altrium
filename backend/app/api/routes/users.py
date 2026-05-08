from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID
import asyncio
import os
from web3 import Web3
from app.schemas.schemas import UserResponse, WalletPatchRequest, UserUpdate
from app.models.models import User, UserRole
from app.crud.crud import UserCRUD
from app.api.deps.auth import get_current_user, require_role, require_verified_admin
from fastapi import File, UploadFile
from uuid import uuid4
from app.core.config import settings
# Telegram notification service used below via local import

router = APIRouter(prefix=f"{settings.API_V1_STR}/users", tags=["users"])

@router.get("/universities", response_model=List[str])
async def get_registered_universities():
    """Return a unique list of college names from all registered and verified admins."""
    # Find all admins who have a college name set
    admins = await User.find(
        User.role == UserRole.ADMIN,
        User.college_name != None
    ).to_list()
    
    # Get unique college names
    universities = sorted(list(set(admin.college_name for admin in admins if admin.college_name)))
    return universities


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    current_user: User = Depends(require_verified_admin)
):
    return await UserCRUD.get_all()

REGISTRY_ABI = [
    {
        "type": "function",
        "name": "addUniversity",
        "inputs": [
            {"name": "universityAdmin", "type": "address"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "hasRole",
        "inputs": [
            {"name": "role", "type": "bytes32"},
            {"name": "account", "type": "address"}
        ],
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view"
    }
]

@router.post("/verify-admin/{user_id}", response_model=UserResponse)
async def verify_admin(
    user_id: UUID,
    current_user: User = Depends(require_role(UserRole.SUPERADMIN))
):
    user = await UserCRUD.get_by_id(user_id)
    if not user or user.role != "ADMIN":
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if user.is_legal_admin_verified:
        return user
        
    try:
        # If Web3 environment is configured AND the admin has already connected a wallet,
        # grant the on-chain role via the deploying wallet.
        # If the admin has no wallet yet, we skip the on-chain step — they can connect
        # their wallet later in the admin dashboard before minting degrees.
        if settings.PRIVATE_KEY and settings.CONTRACT_REGISTRY_ADDRESS and user.wallet_address:
            w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URI))
            if w3.is_connected():
                account = w3.eth.account.from_key(settings.PRIVATE_KEY)
                registry_contract = w3.eth.contract(address=settings.CONTRACT_REGISTRY_ADDRESS, abi=REGISTRY_ABI)
                admin_wallet = w3.to_checksum_address(user.wallet_address)
                UNIVERSITY_ROLE = Web3.keccak(text="UNIVERSITY_ROLE")
                
                # Check if they already have the role.
                has_role = registry_contract.functions.hasRole(UNIVERSITY_ROLE, admin_wallet).call()
                if not has_role:
                    tx = registry_contract.functions.grantRole(
                        UNIVERSITY_ROLE, 
                        admin_wallet
                    ).build_transaction({
                        'from': account.address,
                        'nonce': w3.eth.get_transaction_count(account.address),
                        'gas': 200000,
                        'gasPrice': w3.eth.gas_price
                    })
                    signed_tx = w3.eth.account.sign_transaction(tx, private_key=settings.PRIVATE_KEY)
                    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                    
                    # Wait for transaction confirmation
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                    if receipt.status != 1:
                        raise HTTPException(status_code=500, detail="On-chain role grant transaction failed.")
        
        user.is_legal_admin_verified = True
        from datetime import datetime
        user.updated_at = datetime.utcnow()
        await user.save()

        # from app.services.telegram_bot import service as tg_service
        # # Fire-and-forget notification to the admin
        # asyncio.create_task(
        #     tg_service.notify_verification(
        #         user.full_name or user.email,
        #         user.college_name or "your institution",
        #         user.telegram_id
        #     )
        # )

        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@router.patch("/me/wallet", response_model=UserResponse)
async def update_wallet_address(
    body: WalletPatchRequest,
    current_user: User = Depends(require_verified_admin),
):
    """
    Saves the verified admin's wallet address and grants UNIVERSITY_ROLE on-chain.

    The request schema's `pattern=WALLET_ADDRESS_PATTERN` rejects anything that
    is not an EVM / Ethereum 0x-prefixed 20-byte hex address (so Solana,
    Bitcoin, Cosmos, etc. never pass — the admin cannot connect via a non-EVM
    wallet and therefore cannot reach web3 actions).

    Only reachable after the Superadmin has approved the admin
    (is_legal_admin_verified=True). Unverified admins get a 403 from the
    dependency — they must wait on the pending-verification screen.
    """
    # Normalise to EIP-55 checksum so on-chain comparisons are stable.
    wallet_address = Web3.to_checksum_address(body.wallet_address)

    current_user.wallet_address = wallet_address
    from datetime import datetime
    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    if (
        current_user.is_legal_admin_verified
        and settings.PRIVATE_KEY
        and settings.CONTRACT_REGISTRY_ADDRESS
    ):
        try:
            w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URI))
            if w3.is_connected():
                account = w3.eth.account.from_key(settings.PRIVATE_KEY)
                registry_contract = w3.eth.contract(
                    address=settings.CONTRACT_REGISTRY_ADDRESS, abi=REGISTRY_ABI
                )
                admin_wallet = w3.to_checksum_address(wallet_address)
                UNIVERSITY_ROLE = Web3.keccak(text="UNIVERSITY_ROLE")

                has_role = registry_contract.functions.hasRole(UNIVERSITY_ROLE, admin_wallet).call()
                if not has_role:
                    tx = registry_contract.functions.addUniversity(
                        admin_wallet
                    ).build_transaction({
                        'from': account.address,
                        'nonce': w3.eth.get_transaction_count(account.address),
                        'gas': 200000,
                        'gasPrice': w3.eth.gas_price
                    })
                    signed_tx = w3.eth.account.sign_transaction(tx, private_key=settings.PRIVATE_KEY)
                    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                    w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"addUniversity on-chain failed after wallet save: {e}")

    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update current user's profile information."""
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.college_name is not None:
        current_user.college_name = body.college_name
    
    from datetime import datetime
    current_user.updated_at = datetime.utcnow()
    await current_user.save()
    return current_user


@router.post("/me/logo", response_model=UserResponse)
async def upload_college_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Upload university logo for an admin."""
    # Ensure uploads directory exists
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "uploads")
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)

    # Generate unique filename
    ext = os.path.splitext(file.filename or "")[1]
    filename = f"logo_{current_user.id}_{uuid4().hex[:8]}{ext}"
    file_path = os.path.join(uploads_dir, filename)

    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Update user
    current_user.college_logo = f"/uploads/{filename}"
    from datetime import datetime
    current_user.updated_at = datetime.utcnow()
    await current_user.save()
    return current_user


@router.get("/my-students", response_model=List[UserResponse])
async def get_my_students(
    current_user: User = Depends(require_verified_admin)
):
    """Return all students enrolled in the same college as this admin."""
    if not current_user.college_name:
        return []
    return await User.find(
        User.role == UserRole.STUDENT,
        User.college_name == current_user.college_name
    ).to_list()

@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_role(UserRole.SUPERADMIN))
):
    """Delete a user from the system."""
    user = await UserCRUD.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    success = await UserCRUD.delete(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete user")
    return None
