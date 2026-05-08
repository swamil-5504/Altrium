import { CodeBlock, DocPage, Sub, Ol, Ul } from "../_shared";
import { useDocsContent } from "../content";

const Quickstart = () => {
  const page = useDocsContent().pages.quickstart;

  return (
    <DocPage kicker={page.kicker} title={page.title} summary={page.summary}>
      <Sub id="prerequisites" title={page.sections.prerequisites.title}>
        <Ul>
          {page.sections.prerequisites.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </Ul>
      </Sub>

      <Sub id="install-docker" title={page.sections.installWithDocker.title}>
        <CodeBlock
          lang="bash"
          code={`git clone https://github.com/swamil-5504/Altrium-FYP.git
cd Altrium-FYP

# populate backend/.env and frontend/.env (see "Environment variables")

docker compose up --build

# App:       http://localhost:5173
# API docs:  http://localhost:8000/docs`}
        />
        <p>{page.sections.installWithDocker.body}</p>
      </Sub>

      <Sub id="install-manual" title={page.sections.manualInstall.title}>
        <CodeBlock
          lang="bash"
          code={`# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend (in a new shell)
cd frontend
npm install
npm run dev

# 3. Smart contracts (optional - pre-deployed on Sepolia)
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast`}
        />
      </Sub>

      <Sub id="environment" title={page.sections.environment.title}>
        <p>{page.sections.environment.backendLabel}</p>
        <CodeBlock
          lang="env"
          code={`SECRET_KEY=change_me_to_a_long_random_string
DATABASE_URL=mongodb://mongo:27017/altrium
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

WEB3_PROVIDER_URI=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
CONTRACT_SBT_ADDRESS=0x...
CONTRACT_REGISTRY_ADDRESS=0x...
REGISTRY_ADDRESS=0x...
PRIVATE_KEY=0x...   # deployer wallet; used to grant UNIVERSITY_ROLE

TELEGRAM_BOT_TOKEN=your_bot_token
WEBHOOK_HOST=https://your-ngrok-url.ngrok-free.dev
ALLOWED_HOSTS=your-ngrok-url.ngrok-free.dev,localhost,127.0.0.1

ALLOW_SELF_SERVE_PASSWORD_RESET=false  # must be false in production`}
        />
        <p>{page.sections.environment.frontendLabel}</p>
        <CodeBlock
          lang="env"
          code={`VITE_API_BASE_URL=http://localhost:8000
VITE_CONTRACT_SBT_ADDRESS=0x...
VITE_CONTRACT_REGISTRY_ADDRESS=0x...
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_WEB3_PROVIDER_URI=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_REGISTRY_ADDRESS=0x...
VITE_REOWN_PROJECT_ID=your_reown_projectid`}
        />
      </Sub>

      <Sub id="first-run" title={page.sections.checklist.title}>
        <Ol>
          {page.sections.checklist.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </Ol>
      </Sub>
    </DocPage>
  );
};

export default Quickstart;
