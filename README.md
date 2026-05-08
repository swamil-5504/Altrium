# Altrium — Blockchain-Based Degree Verification System

Altrium is a full-stack blockchain-powered degree verification platform built as a Final Year Project. It allows universities to issue tamper-proof degrees as Soulbound Tokens (SBTs) on the Ethereum Sepolia testnet, and enables employers to verify credentials instantly using a student's PRN or email — no intermediaries, no fraud.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | Python + FastAPI |
| Database | MongoDB |
| Blockchain | Solidity Smart Contracts on Sepolia Testnet |
| Auth | JWT + Role-Based Access Control (RBAC) |
| Infrastructure | Docker + Docker Compose |

---

## User Roles

- **Super Admin** — Approves or rejects University Admin registration requests
- **University Admin** — Reviews student degree submissions and mints Soulbound Tokens on-chain
- **Student** — Submits degree documents for on-chain verification
- **Employer** — Verifies any student's degree instantly using PRN or email. No login required.

---

## Issuer Trust Model

Altrium binds every issuing university to an entry in an **accreditation registry** (UGC / AICTE / MoE seeded list). Admin registration is rejected if the submitted `college_name` does not match an active registry entry, preventing a bad actor from signing up as "Harvard University" and minting fraudulent credentials. The registry is seeded idempotently on startup from `app/services/institution_seed.py` and exposed via `GET /api/v1/institutions`. Verified credentials surface an "Accredited" badge on the public verify page.

Existing admins predating this gate are grandfathered (their `institution_id` stays unset) — login and existing degree display are unchanged. New admins get `institution_id` auto-populated and `college_name` snapped to the canonical registry casing for deterministic on-chain hashing.

---

## Prerequisites

- Docker & Docker Compose (Recommended)

**OR** manually:
- Node.js 18+
- Python 3.11+
- npm
- MongoDB

---

## Quick Start

### Using Docker (Recommended)

**Step 1 — Clone the repository:**
```bash
git clone https://github.com/swamil-5504/Altrium-FYP.git
cd Altrium-FYP
```

**Step 2 — Set up environment files:**

Create `backend/.env`:
```env
SECRET_KEY=your_secret_key
DATABASE_URL=sqlite:///./altrium.db
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
WEB3_PROVIDER_URI=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
CONTRACT_SBT_ADDRESS=your_sbt_contract_address
CONTRACT_REGISTRY_ADDRESS=your_registry_contract_address
REGISTRY_ADDRESS=your_registry_address
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_deployer_wallet_private_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
```

Create `frontend/.env`:
```env
VITE_CONTRACT_SBT_ADDRESS=your_sbt_contract_address
VITE_CONTRACT_REGISTRY_ADDRESS=your_registry_contract_address
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_WEB3_PROVIDER_URI=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_REGISTRY_ADDRESS=your_registry_address
VITE_TELEGRAM_BOT_USERNAME=your_bot_username_without_@
```

**Step 3 — Start the project:**
```bash
docker-compose up --build
```

**Step 4 — Open in browser:**
http://localhost:5173/

---

## Telegram Notification System

Altrium uses a central Telegram Bot to push instant notifications for Degree Approvals, Rejections, and Registration Events.

**How it works in production:**
1. You (the platform owner) create a single, official bot via `@BotFather` on Telegram.
2. The `TELEGRAM_BOT_TOKEN` for this official bot is placed in your production server's `backend/.env`.
3. The `VITE_TELEGRAM_BOT_USERNAME` is placed in your `frontend/.env` so the website points students to the correct bot.
4. Users registering on the website provide their Telegram ID and click "Start" on your official bot.
5. The backend uses the central token to securely message individual users.

*Note for local development: Create your own test bot via `@BotFather`, grab the token, and put it in your `.env` files. Users never need to create their own bots.*

---

## Daily Development Workflow

```bash
# Pull latest changes
git pull origin main --no-edit

# Start project
docker-compose up -d

# If teammates pushed new code changes
docker-compose up --build -d

# Stop project
docker-compose down
```