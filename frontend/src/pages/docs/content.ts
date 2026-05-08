import { useTranslation } from "react-i18next";

type SupportedDocsLanguage = "en" | "hi" | "mr";

const resolveDocsLanguage = (language?: string): SupportedDocsLanguage => {
  if (language?.startsWith("hi")) return "hi";
  if (language?.startsWith("mr")) return "mr";
  return "en";
};

const docsContent = {
  en: {
    shared: {
      copy: "Copy",
      copied: "Copied",
      copyCode: "Copy code",
      linkToSection: (title: string) => `Link to ${title}`,
      note: "Note",
      warning: "Warning",
      comingSoon: "Coming soon",
      notYetShipped: "Not yet shipped",
      plannedForNextRelease: "Planned for the next major release.",
      whatsPlanned: "What's planned",
      plannedApiSurface: "Planned API surface",
      stayInTheLoop: "Stay in the loop",
      followProgress:
        "Follow progress on GitHub - milestones and changelog entries land there first.",
      backToDocsHome: "Back to docs home",
    },
    pages: {
      introduction: {
        kicker: "Introduction",
        title: "What is Altrium?",
        summary:
          "A full-stack, blockchain-powered degree-verification platform. Universities issue tamper-proof academic credentials as Soulbound Tokens (SBTs) on Ethereum Sepolia; employers verify them in seconds - no intermediaries, no forgeries, no phone calls.",
        sections: {
          atAGlance: {
            title: "At a glance",
            cards: [
              ["Frontend", "React 18 + TypeScript, Vite, Tailwind, Reown AppKit, ethers v6."],
              ["Backend", "FastAPI (async), Pydantic v2, Beanie ODM on MongoDB."],
              ["Blockchain", "Solidity 0.8.x, Foundry, OpenZeppelin, Sepolia testnet."],
              ["Infra", "Docker Compose - one command boots mongo, backend, frontend."],
            ],
          },
          whyBlockchain: {
            title: "Why blockchain credentials?",
            items: [
              ["Immutable provenance.", "Once minted, a degree record cannot be silently edited or erased."],
              ["Non-transferable (soulbound).", "SBTs cannot be sold or gifted - a credential always belongs to the original student."],
              ["Public verifiability.", "Any employer can check a credential without a login by querying the public API or reading the chain."],
              ["Revocable by issuer.", "The issuing university can revoke a degree on-chain if issued in error - the audit trail is preserved."],
            ],
          },
          keyConcepts: {
            title: "Key concepts",
            items: [
              ["PRN (Permanent Registration Number)", "Canonical student identifier. Employers verify by PRN."],
              ["SBT", "Soulbound Token. An ERC-721-style credential with transfer disabled."],
              ["UNIVERSITY_ROLE", "On-chain role granted by the Registry. Only holders can mint degrees."],
              ["Verified Admin", "A University Admin whose off-chain identity has been approved by the Super Admin."],
            ],
          },
          whoIsThisFor: {
            title: "Who are these docs for?",
            items: [
              ["Operators", "Deploying Altrium for a university or consortium."],
              ["Integrators", "Wiring the public verification endpoint into HR or ATS tooling."],
              ["Contributors", "Extending the contracts, backend, or UI."],
              ["Auditors", "Reviewing the security posture before production use."],
            ],
          },
        },
      },
      quickstart: {
        kicker: "Quickstart",
        title: "Run Altrium in 15 minutes",
        summary:
          "This guide stands up the full stack on your machine - MongoDB, the FastAPI backend, the Vite dev server, and the Sepolia-connected frontend - all behind one Docker Compose file.",
        sections: {
          prerequisites: {
            title: "Prerequisites",
            items: [
              "Docker & Docker Compose (recommended), or",
              "Node.js 18+, Python 3.11+, npm, MongoDB 6+",
              "A MetaMask wallet funded with Sepolia ETH",
              "An Infura / Alchemy Sepolia RPC URL",
            ],
          },
          installWithDocker: {
            title: "Install with Docker",
            body:
              "Compose spins up MongoDB, the FastAPI backend, and the Vite dev server in a single command. Logs stream to your terminal; Ctrl+C gracefully stops all three.",
          },
          manualInstall: {
            title: "Manual install",
          },
          environment: {
            title: "Environment variables",
            backendLabel: "Create backend/.env:",
            frontendLabel: "Create frontend/.env:",
          },
          checklist: {
            title: "First run checklist",
            items: [
              "Visit http://localhost:5173 - the landing page loads.",
              "Register as a Super Admin (first registered superadmin is auto-approved).",
              "Register a University Admin account and upload a verification PDF.",
              "Log in as Super Admin and approve the admin.",
              "As the admin, connect MetaMask on Sepolia - triggers the on-chain addUniversity call.",
              "Register as a Student, and link your Telegram account via the dashboard's Magic Link.",
              "Submit a degree, let the admin mint it, and watch the bot send you a real-time alert.",
              "From any browser, visit /verify and look up by PRN.",
            ],
          },
        },
      },
      architecture: {
        kicker: "Architecture",
        title: "How Altrium fits together",
        summary:
          "Four layers - React frontend, FastAPI backend, MongoDB store, Solidity contracts - cooperate over a single REST interface and a pair of on-chain contracts.",
        sections: {
          stackOverview: {
            title: "Stack overview",
            cards: [
              ["Frontend", "React 18 + TypeScript, Vite, Tailwind, Reown AppKit, ethers v6."],
              ["Backend", "FastAPI (async), Pydantic v2, Beanie ODM, slowapi rate limiting."],
              ["Database", "MongoDB 6 (document store, TTL index for blacklisted tokens)."],
              ["Auth", "JWT access + refresh tokens, bcrypt password hashing, RBAC."],
              ["Blockchain", "Solidity 0.8.x, Foundry, OpenZeppelin AccessControl, Sepolia."],
              ["Infra", "Docker Compose - three services: mongo, backend, frontend."],
            ],
          },
          dataModel: {
            title: "Data model",
            intro: "Two primary collections drive the whole domain:",
          },
          requestFlow: {
            title: "Request flow - mint a degree",
            body:
              "A mint request traverses all four layers. The React app asks MetaMask to sign the on-chain transaction; the backend records the resulting hash and token id; the contract emits a DegreeMinted event; any employer can then verify the SBT off the public endpoint or by reading the chain directly.",
          },
          trustBoundary: {
            title: "Trust boundary",
            body:
              "The on-chain mint is the system's source of truth. Even a fully compromised backend cannot forge a credential without also holding UNIVERSITY_ROLE on the Registry contract. Conversely, the backend is the source of truth for off-chain state - PDF documents, pending submissions, and revocation metadata visible to employers.",
          },
        },
      },
      roles: {
        kicker: "User Roles",
        title: "Who does what",
        summary:
          "Altrium separates on-chain authority (only university wallets can mint) from off-chain identity (the Super Admin controls who becomes a university wallet in the first place). Four roles, each with a bounded surface area.",
        items: [
          [
            "superadmin",
            "Super Admin",
            "Platform operator. Approves or rejects University Admin registration requests, can delete any user, and is the only role that can flip is_legal_admin_verified. Signs the on-chain grantRole(UNIVERSITY_ROLE, ...) transaction once the admin has connected a wallet.",
          ],
          [
            "university-admin",
            "University Admin",
            "Represents an issuing institution. Reviews student submissions, connects an EVM wallet via MetaMask (EIP-55 checksum-normalised), and signs the on-chain mint. Can revoke credentials post-issuance.",
          ],
          [
            "student",
            "Student",
            "Submits a degree PDF and metadata (course, grade, year) for their registered college. Once the admin mints, the student sees the on-chain token id and transaction hash on their dashboard.",
          ],
          [
            "employer",
            "Employer",
            "No account required. Enters a student PRN (or email) on /verify and receives an authoritative response including the SBT token id and issuing university.",
          ],
        ],
      },
      walkthroughs: {
        kicker: "Walkthroughs",
        title: "End-to-end flows",
        summary:
          "Concrete, copy-pastable walkthroughs for every major user journey. Each flow lists the exact endpoints and contract calls involved.",
        sections: {
          registration: {
            title: "Register & onboard",
            items: [
              "Open /register.",
              "Pick a role (Student or University Admin).",
              "Students pick a college from the dropdown populated by GET /api/v1/users/universities.",
              "Admins additionally upload a verification PDF via POST /api/v1/auth/{user_id}/verification-document.",
              "Admins are redirected to /pending-verification until a Super Admin approves them.",
            ],
          },
          adminApproval: {
            title: "Admin approval",
            items: [
              "Super Admin visits /superadmin.",
              "Opens the pending admin and reviews the PDF.",
              "Clicks Approve -> backend calls POST /api/v1/users/verify-admin/{id}.",
              "If the admin already has a wallet connected, the backend also submits grantRole(UNIVERSITY_ROLE, wallet) on-chain.",
            ],
          },
          connectWallet: {
            title: "Connect wallet",
            items: [
              "Verified admin opens /university.",
              "Clicks Connect Wallet - Reown AppKit opens MetaMask on Sepolia.",
              "Frontend PATCHes /api/v1/users/me/wallet with the checksum address.",
              "Backend persists the address and, if not already granted, calls addUniversity() on the Registry.",
            ],
            callout:
              "Only EVM (0x-prefixed 20-byte hex) wallets are accepted. The schema validator rejects Solana, Bitcoin, and Cosmos addresses outright.",
          },
          studentSubmission: {
            title: "Student submission",
          },
          mintSbt: {
            title: "Mint an SBT",
            items: [
              "Admin reviews submission on /university.",
              "Clicks Mint. Frontend calls AltriumDegreeSBT.mintDegree(studentWallet, metadataURI) via ethers + MetaMask.",
              "On success, frontend PATCHes /api/v1/degrees/{id}/status with status=MINTED, the transaction hash, and the token id.",
              "Student sees the minted credential on /student with a link to the Sepolia explorer.",
            ],
          },
          employerVerification: {
            title: "Employer verification",
            intro: "Employers do not need to register. They open /verify and paste a PRN.",
            note: "Rate-limited to 30 requests/minute per IP to prevent scraping of the student directory.",
          },
          revokeDegree: {
            title: "Revoke a degree",
            body:
              "If a degree was issued in error, the admin can revoke it from the dashboard. This triggers PATCH /api/v1/degrees/{id}/revoke, which flips revoked=true and (optionally) burns the SBT on-chain. The record stays visible to employers, who see the revoked flag clearly.",
          },
        },
      },
      apiReference: {
        kicker: "API Reference",
        title: "REST over HTTPS",
        summary:
          "Every Altrium endpoint, its role requirements, and its rate limits. Auto-generated OpenAPI docs are served at /docs (Swagger) and /redoc.",
        sections: {
          overview: {
            title: "Overview",
            body:
              "Base URL: http://localhost:8000 in development, your production hostname otherwise. All routes are namespaced under /api/v1. Responses are JSON unless the endpoint serves a binary (currently only GET /degrees/{id}/document, which streams application/pdf).",
          },
          authentication: {
            title: "Authentication",
            intro: "Bearer-token auth. After login, include the access token on every protected request:",
            body:
              "Access tokens expire after ACCESS_TOKEN_EXPIRE_MINUTES (default 30). Refresh via POST /api/v1/auth/refresh. On logout, both tokens are blacklisted in MongoDB with a TTL index matching each token's real exp.",
          },
          errors: {
            title: "Errors & rate limits",
            intro: "Errors follow FastAPI's convention: { \"detail\": \"Message\" }.",
            codes: [
              ["400", "Validation failed"],
              ["401", "Missing / expired / blacklisted token"],
              ["403", "Role or verification check failed"],
              ["404", "Resource not found"],
              ["409", "Duplicate (e.g. PRN already registered)"],
              ["429", "Rate limited"],
            ],
            note: "Auth: 5/min login, 10/min register, 30/min refresh. Public verification: 30/min. Uploads: 20/min.",
          },
          authEndpoints: {
            title: "Auth endpoints",
            items: [
              ["POST", "/api/v1/auth/register", "public · 10/min", "Creates a user. Body: { email, password, full_name, role, college_name?, prn_number? }."],
              ["POST", "/api/v1/auth/login", "public · 5/min", "Returns { access_token, refresh_token, token_type }."],
              ["POST", "/api/v1/auth/refresh", "public · 30/min", "Body: { refresh_token }. Returns a new token pair."],
              ["POST", "/api/v1/auth/forgot-password", "dev-only · 5/min", "Disabled in production. Always returns 204 to avoid account enumeration."],
              ["POST", "/api/v1/auth/change-password", "Bearer · 10/min", "Body: { old_password, new_password }. 204 on success."],
              ["POST", "/api/v1/auth/{user_id}/verification-document", "Bearer · 20/min", "Multipart upload of the admin verification PDF. Caller must be the user themselves or a Super Admin."],
              ["POST", "/api/v1/auth/logout", "Bearer", "Blacklists the access token from the header and the refresh token from the body."],
            ],
          },
          usersEndpoints: {
            title: "Users endpoints",
            items: [
              ["GET", "/api/v1/users/universities", "public", "Unique list of college names with at least one verified admin."],
              ["GET", "/api/v1/users/me", "Bearer", "Returns the current user's profile."],
              ["GET", "/api/v1/users/", "Verified admin", "Returns every user. Used by the admin dashboard."],
              ["POST", "/api/v1/users/verify-admin/{user_id}", "Super Admin", "Flips is_legal_admin_verified=true and grants UNIVERSITY_ROLE on-chain if a wallet is connected."],
              ["PATCH", "/api/v1/users/me/wallet", "Verified admin", "Body: { wallet_address }. Checksum-normalised and pushed to the Registry via addUniversity()."],
              ["GET", "/api/v1/users/my-students", "Verified admin", "Returns every student enrolled in the admin's college."],
              ["DELETE", "/api/v1/users/{user_id}", "Super Admin", "Hard-deletes a user. Returns 204."],
            ],
          },
          degreesEndpoints: {
            title: "Degrees endpoints",
            items: [
              ["POST", "/api/v1/degrees/", "Student", "Create a submission (status starts at PENDING)."],
              ["GET", "/api/v1/degrees/", "Bearer", "List credentials scoped to the caller - students see theirs, admins see their college's, superadmin sees all."],
              ["GET", "/api/v1/degrees/public", "public · 30/min", "Query param: prn_number. No auth - the employer path."],
              ["GET", "/api/v1/degrees/{credential_id}", "Bearer", "Single credential, permission-scoped like the list endpoint."],
              ["PATCH", "/api/v1/degrees/{credential_id}/status", "Admin + wallet", "Body: new CredentialStatus. Used after the on-chain mint succeeds."],
              ["PATCH", "/api/v1/degrees/{credential_id}", "Admin + wallet", "Update fields (e.g., tx_hash, sbt_token_id)."],
              ["DELETE", "/api/v1/degrees/{credential_id}", "Admin + wallet", "Hard-delete a credential."],
              ["PATCH", "/api/v1/degrees/{credential_id}/revoke", "Admin + wallet", "Mark an issued credential as revoked."],
              ["POST", "/api/v1/degrees/{credential_id}/reset", "Admin + wallet", "Reset a submission to PENDING after an on-chain burn (test phase)."],
              ["POST", "/api/v1/degrees/{credential_id}/document", "Bearer · 20/min", "Multipart upload of the degree PDF. Only the owning student or their admin can upload."],
              ["GET", "/api/v1/degrees/{credential_id}/document", "Bearer", "Streams the PDF with an on-chain-audit footer watermark applied when permitted."],
            ],
          },
        },
      },
      smartContracts: {
        kicker: "Smart Contracts",
        title: "Solidity on Sepolia",
        summary:
          "Two contracts run the on-chain half of Altrium: the Registry controls which wallets may issue credentials, and the Degree SBT mints and revokes them.",
        sections: {
          registry: {
            title: "AltriumRegistry",
            body:
              "OpenZeppelin AccessControl wrapper that owns the canonical list of approved universities. The deployer holds DEFAULT_ADMIN_ROLE; verified admin wallets hold UNIVERSITY_ROLE.",
          },
          sbt: {
            title: "AltriumDegreeSBT",
            body:
              "ERC-721 with every transfer path reverted - a true Soulbound Token. Only addresses that hold UNIVERSITY_ROLE on the Registry can mint.",
          },
          deployment: {
            title: "Deployment",
            body:
              "After deployment, the deployer wallet must call addUniversity(adminWallet) for each approved admin. The backend automates this whenever Super Admin clicks Approve on an admin who already has a wallet on file.",
          },
          events: {
            title: "Events",
            body: "Both contracts emit events that can be indexed for analytics or webhooks:",
          },
        },
      },
      security: {
        kicker: "Security",
        title: "Defense in depth",
        summary:
          "Altrium layers authentication, authorisation, upload hygiene, and strict transport headers. The on-chain mint is the ultimate integrity anchor - the backend cannot silently forge credentials.",
        sections: {
          securityModel: {
            title: "Security model",
            items: [
              "Every mutating endpoint requires a valid JWT and passes through an RBAC dependency.",
              "The on-chain mint is the source of truth - a compromised backend cannot forge a credential without also holding UNIVERSITY_ROLE.",
              "Uploads are content-sniffed, magic-byte-validated, and size-capped before touching disk.",
              "Strict security headers (CSP, X-Frame-Options, Referrer-Policy, HSTS) applied via middleware.",
            ],
          },
          jwt: {
            title: "JWT & sessions",
            body:
              "HS256, 30-minute access tokens, 7-day refresh tokens. Logout persists both JWTs into the BlacklistedToken collection until each token's real exp; the MongoDB TTL index reaps them automatically.",
          },
          rbac: {
            title: "RBAC",
            intro: "Five FastAPI dependencies enforce role checks:",
            items: [
              "get_current_user - any authenticated user",
              "require_role(UserRole.X) - exact role match",
              "require_verified_admin - role=ADMIN + is_legal_admin_verified",
              "require_admin_with_wallet - verified admin + a wallet on file",
              "Superadmin checks use require_role(SUPERADMIN)",
            ],
          },
          pdfValidation: {
            title: "PDF validation",
            intro: "app/services/pdf_validation.py enforces:",
            items: [
              "Exact magic-byte prefix %PDF-",
              "Maximum file size (default 10 MB)",
              "MIME header must be application/pdf",
              "Stripped metadata on download for student-facing copies",
            ],
          },
          rateLimits: {
            title: "Rate limits",
            body: "Per-IP rate limits are applied via slowapi on sensitive routes. See the API reference for the full table.",
          },
        },
      },
      operations: {
        kicker: "Operations",
        title: "Running Altrium in production",
        summary:
          "What you need to know about environments, logging, and the database once you've moved past localhost.",
        sections: {
          environments: {
            title: "Environments",
            body:
              "The ENVIRONMENT env var (dev, staging, prod) drives a boot-time guard in app/main.py that refuses to start with unsafe combinations (e.g. ALLOW_SELF_SERVE_PASSWORD_RESET=true in prod).",
          },
          logs: {
            title: "Logs & observability",
            body:
              "Structured JSON logs go to stdout; correlate by request_id (injected by middleware). In production forward them to any logs sink (Datadog, CloudWatch, Loki, etc.).",
          },
          database: {
            title: "Database",
            intro: "Indexes created on startup by Beanie:",
            items: [
              "User.email - unique",
              "User.prn_number - unique, sparse",
              "Credential.student_id",
              "BlacklistedToken.expires_at - TTL",
            ],
          },
          backups: {
            title: "Backups",
            body:
              "Because the chain stores the cryptographic anchor for every credential, restoring Mongo from a snapshot doesn't rewrite history - the chain authoritatively confirms whether a token still exists. Back up the uploads directory separately; it holds the original PDFs.",
          },
        },
      },
      cli: {
        kicker: "CLI & Scripts",
        title: "Power tools",
        summary:
          "Backend scripts for seeding and introspection, plus the Foundry commands you'll reach for when working on contracts.",
        sections: {
          backendScripts: { title: "Backend scripts" },
          foundryCommands: { title: "Foundry commands" },
          dockerHelpers: { title: "Docker helpers" },
        },
      },
      support: {
        kicker: "Support",
        title: "Get unstuck",
        summary:
          "Troubleshooting for the most common issues, an FAQ, and the channels where you can get help.",
        sections: {
          troubleshooting: {
            title: "Troubleshooting",
            items: [
              ["MetaMask stuck on wrong network.", "Ensure you're on Sepolia (chain id 0xaa36a7). The app requests a network switch on connect."],
              ["Mint transaction reverts.", "The admin wallet likely lacks UNIVERSITY_ROLE. Super Admin must re-approve, or the deployer wallet must call addUniversity() manually."],
              ["401 on every request.", "Token expired. Call /api/v1/auth/refresh or log in again."],
              ["Upload rejected.", "File is either non-PDF, corrupted, or > 10 MB."],
              ["Docker port in use.", "Stop local Mongo/Vite/Uvicorn or edit docker-compose.yml."],
            ],
          },
          faq: {
            title: "FAQ",
            items: [
              ["Does the employer need a wallet?", "No. Verification is a plain HTTP GET - no keys, no login."],
              ["Can a student sell or transfer their SBT?", "No. Transfers revert at the contract level - that's what makes it soulbound."],
              ["What chain is this on?", "Sepolia testnet. The architecture is chain-agnostic; switching to Polygon or an L2 only requires redeploying the two contracts and updating the env vars."],
              ["How is personal data handled?", "Only the minimum - name, email, PRN, college, and the degree PDF. Nothing is written on-chain except an opaque metadata URI and the student wallet."],
              ["Is the API stable?", "The /api/v1 prefix signals the current major. Breaking changes will move to /api/v2 with at least one minor overlap."],
            ],
          },
          contact: {
            title: "Contact & community",
            items: [
              "GitHub issues",
              "Security reports: email the maintainers rather than opening a public issue.",
              "Web3 help",
            ],
          },
        },
      },
      comingSoon: {
        bulkUploadWizard: {
          title: "Bulk Upload Wizard",
          tagline:
            "Issue an entire graduating cohort in one guided import - CSV or XLSX in, blockchain credentials out.",
          intro:
            "The Bulk Upload Wizard allows university administrators to bypass manual row-by-row entry. Upload a roster file, validate student data in real-time, and generate a batch of verified degree submissions in seconds.",
          features: [
            "Direct support for XLSX and CSV roster imports.",
            "Live row-level validation: PRN format, email syntax, and duplicate detection.",
            "Interactive Fix: Correct errors (like missing grades) directly in the UI before importing.",
            "One-Click Batching: Converts valid rows into Pending submissions instantly.",
            "Privacy First: Student data is only stored off-chain until the final minting step.",
            "Idempotency: Re-uploading the same file skips students who already have active submissions.",
          ],
        },
        emailService: {
          title: "Email Service",
          tagline:
            "Transactional notifications and templated mail - from registration confirmations to mint receipts - backed by a pluggable provider.",
          intro:
            "Altrium's current flows assume the student and admin are sitting in front of the app. The upcoming Email Service will send signed, branded messages for every key event: registration, approval decisions, mint confirmations with Etherscan links, revocation notices, and password resets. Providers (SES, Postmark, Resend, or SMTP) plug in behind a single interface.",
          features: [
            "Signed, template-driven emails for registration, approval, mint, revoke, and password reset.",
            "Pluggable transport: SES, Postmark, Resend, or raw SMTP via one env flag.",
            "Per-template dark/light renders with the Altrium brand system.",
            "Delivery retries with exponential backoff and a dead-letter queue visible to the Super Admin.",
            "Webhook ingress for bounce/complaint handling - auto-suppress addresses that hard-bounce.",
            "Audit log of every message sent, scoped by user and by event type.",
          ],
        },
        languageSupport: {
          title: "Language & Script Support",
          tagline:
            "Full i18n for the app surface plus non-Latin script rendering on issued credentials - so a student's name appears exactly as it does on their government ID.",
          intro:
            "Altrium will ship a first-class localisation pipeline: UI strings translated per-locale via ICU message format, locale-aware date and number formatting, and - crucially - proper rendering of Devanagari, Cyrillic, CJK, Arabic, and other non-Latin scripts inside the minted credential PDF and the watermark footer. Right-to-left layouts are supported end-to-end.",
          features: [
            "ICU-based translations for the app shell, dashboards, and error messages.",
            "Per-user locale preference (set during registration, switchable from profile).",
            "Automatic fallback chain - e.g., hi-IN -> hi -> en - so partial translations never break the UI.",
            "Non-Latin-capable PDF renderer for credentials - Devanagari, Cyrillic, CJK, Arabic, Hebrew.",
            "RTL layout support for Arabic and Hebrew without manual CSS overrides.",
            "Contributor workflow: pull requests against locale JSON files gate-checked by a schema linter.",
          ],
        },
      },
    },
  },
  hi: {
    shared: {
      copy: "कॉपी करें",
      copied: "कॉपी हो गया",
      copyCode: "कोड कॉपी करें",
      linkToSection: (title: string) => `${title} सेक्शन का लिंक`,
      note: "नोट",
      warning: "चेतावनी",
      comingSoon: "जल्द आ रहा है",
      notYetShipped: "अभी जारी नहीं हुआ",
      plannedForNextRelease: "अगले बड़े रिलीज़ के लिए योजना में है।",
      whatsPlanned: "क्या योजना है",
      plannedApiSurface: "योजनाबद्ध API सतह",
      stayInTheLoop: "अपडेट में बने रहें",
      followProgress:
        "GitHub पर प्रगति देखें - माइलस्टोन और चेंजलॉग अपडेट सबसे पहले वहीं आते हैं।",
      backToDocsHome: "डॉक्स होम पर वापस जाएँ",
    },
    pages: {
      introduction: {
        kicker: "परिचय",
        title: "Altrium क्या है?",
        summary:
          "एक फुल-स्टैक, ब्लॉकचेन-आधारित डिग्री वेरिफिकेशन प्लेटफ़ॉर्म। विश्वविद्यालय Ethereum Sepolia पर Soulbound Tokens (SBTs) के रूप में छेड़छाड़-रोधी अकादमिक क्रेडेंशियल जारी करते हैं; नियोक्ता कुछ ही सेकंड में उन्हें सत्यापित कर सकते हैं - बिना बिचौलियों, बिना जालसाजी, बिना फोन कॉल के।",
        sections: {
          atAGlance: {
            title: "एक नज़र में",
            cards: [
              ["फ्रंटएंड", "React 18 + TypeScript, Vite, Tailwind, Reown AppKit, ethers v6."],
              ["बैकएंड", "FastAPI (async), Pydantic v2, Beanie ODM on MongoDB."],
              ["ब्लॉकचेन", "Solidity 0.8.x, Foundry, OpenZeppelin, Sepolia testnet."],
              ["इन्फ्रा", "Docker Compose - एक कमांड से mongo, backend और frontend शुरू हो जाते हैं।"],
            ],
          },
          whyBlockchain: {
            title: "ब्लॉकचेन क्रेडेंशियल क्यों?",
            items: [
              ["अपरिवर्तनीय स्रोत.", "मिंट होने के बाद डिग्री रिकॉर्ड को चुपचाप बदला या मिटाया नहीं जा सकता।"],
              ["ट्रांसफर न होने वाला (soulbound).", "SBTs को बेचा या गिफ्ट नहीं किया जा सकता - क्रेडेंशियल हमेशा मूल छात्र का ही रहता है।"],
              ["सार्वजनिक सत्यापन.", "कोई भी नियोक्ता सार्वजनिक API या चेन पढ़कर बिना लॉगिन क्रेडेंशियल जांच सकता है।"],
              ["जारीकर्ता द्वारा रद्द करने योग्य.", "अगर डिग्री गलती से जारी हुई है, तो विश्वविद्यालय उसे ऑन-चेन revoke कर सकता है - ऑडिट ट्रेल सुरक्षित रहती है।"],
            ],
          },
          keyConcepts: {
            title: "मुख्य अवधारणाएँ",
            items: [
              ["PRN (Permanent Registration Number)", "छात्र की मानक पहचान। नियोक्ता PRN के आधार पर सत्यापन करते हैं।"],
              ["SBT", "Soulbound Token। एक ERC-721-शैली का क्रेडेंशियल जिसमें ट्रांसफर बंद है।"],
              ["UNIVERSITY_ROLE", "Registry द्वारा दिया गया ऑन-चेन रोल। केवल यही धारक डिग्री मिंट कर सकते हैं।"],
              ["Verified Admin", "ऐसा University Admin जिसकी ऑफ-चेन पहचान Super Admin द्वारा अनुमोदित हो।"],
            ],
          },
          whoIsThisFor: {
            title: "ये डॉक्स किनके लिए हैं?",
            items: [
              ["ऑपरेटर", "जो किसी विश्वविद्यालय या consortium के लिए Altrium deploy कर रहे हैं।"],
              ["इंटीग्रेटर", "जो public verification endpoint को HR या ATS tooling से जोड़ रहे हैं।"],
              ["कॉन्ट्रिब्यूटर", "जो contracts, backend या UI को आगे बढ़ा रहे हैं।"],
              ["ऑडिटर", "जो production उपयोग से पहले security posture की समीक्षा कर रहे हैं।"],
            ],
          },
        },
      },
      quickstart: {
        kicker: "क्विकस्टार्ट",
        title: "15 मिनट में Altrium चलाएँ",
        summary:
          "यह गाइड आपकी मशीन पर पूरा स्टैक खड़ा करती है - MongoDB, FastAPI backend, Vite dev server और Sepolia-connected frontend - सब एक ही Docker Compose फ़ाइल के पीछे।",
        sections: {
          prerequisites: {
            title: "पूर्वापेक्षाएँ",
            items: [
              "Docker और Docker Compose (सुझावित), या",
              "Node.js 18+, Python 3.11+, npm, MongoDB 6+",
              "Sepolia ETH से funded एक MetaMask wallet",
              "Infura / Alchemy Sepolia RPC URL",
            ],
          },
          installWithDocker: {
            title: "Docker से इंस्टॉल करें",
            body:
              "Compose एक ही कमांड में MongoDB, FastAPI backend और Vite dev server शुरू कर देता है। Logs आपके terminal में stream होते हैं; Ctrl+C से तीनों सेवाएँ सुरक्षित रूप से बंद हो जाती हैं।",
          },
          manualInstall: { title: "मैन्युअल इंस्टॉल" },
          environment: {
            title: "Environment variables",
            backendLabel: "backend/.env बनाएँ:",
            frontendLabel: "frontend/.env बनाएँ:",
          },
          checklist: {
            title: "पहली रन चेकलिस्ट",
            items: [
              "http://localhost:5173 खोलें - landing page लोड होनी चाहिए।",
              "Super Admin के रूप में register करें (पहला registered superadmin auto-approved होता है)।",
              "University Admin account बनाएँ और verification PDF upload करें।",
              "Super Admin के रूप में लॉगिन करें और admin approve करें।",
              "Admin के रूप में Sepolia पर MetaMask connect करें - इससे on-chain addUniversity call ट्रिगर होती है।",
              "Student के रूप में register करें, degree submit करें, फिर admin से mint करवाएँ।",
              "किसी भी browser से /verify खोलें और PRN से खोजें।",
            ],
          },
        },
      },
      architecture: {
        kicker: "आर्किटेक्चर",
        title: "Altrium कैसे एक साथ काम करता है",
        summary:
          "चार लेयर - React frontend, FastAPI backend, MongoDB store और Solidity contracts - एक REST interface और दो on-chain contracts के ज़रिए साथ काम करती हैं।",
        sections: {
          stackOverview: {
            title: "स्टैक अवलोकन",
            cards: [
              ["फ्रंटएंड", "React 18 + TypeScript, Vite, Tailwind, Reown AppKit, ethers v6."],
              ["बैकएंड", "FastAPI (async), Pydantic v2, Beanie ODM, slowapi rate limiting."],
              ["डेटाबेस", "MongoDB 6 (document store, TTL index for blacklisted tokens)."],
              ["ऑथ", "JWT access + refresh tokens, bcrypt password hashing, RBAC."],
              ["ब्लॉकचेन", "Solidity 0.8.x, Foundry, OpenZeppelin AccessControl, Sepolia."],
              ["इन्फ्रा", "Docker Compose - तीन services: mongo, backend, frontend."],
            ],
          },
          dataModel: {
            title: "डेटा मॉडल",
            intro: "पूरे डोमेन को दो मुख्य collections संचालित करती हैं:",
          },
          requestFlow: {
            title: "रिक्वेस्ट फ्लो - डिग्री मिंट करना",
            body:
              "एक mint request चारों लेयर से होकर गुजरती है। React app MetaMask से on-chain transaction sign करवाता है; backend resulting hash और token id रिकॉर्ड करता है; contract DegreeMinted event emit करता है; उसके बाद कोई भी employer public endpoint या chain पढ़कर SBT verify कर सकता है।",
          },
          trustBoundary: {
            title: "ट्रस्ट बाउंडरी",
            body:
              "On-chain mint सिस्टम का source of truth है। पूरी तरह compromised backend भी Registry contract पर UNIVERSITY_ROLE के बिना credential forge नहीं कर सकता। दूसरी ओर, off-chain state - PDF documents, pending submissions और employers को दिखने वाला revocation metadata - का source of truth backend है।",
          },
        },
      },
      roles: {
        kicker: "यूज़र रोल",
        title: "कौन क्या करता है",
        summary:
          "Altrium on-chain authority (केवल university wallets mint कर सकते हैं) और off-chain identity (Super Admin तय करता है कि कौन university wallet बनेगा) को अलग रखता है। चार रोल, और हर एक का सीमित कार्यक्षेत्र।",
        items: [
          [
            "superadmin",
            "Super Admin",
            "प्लेटफ़ॉर्म ऑपरेटर। University Admin registration requests को approve या reject करता है, किसी भी user को delete कर सकता है, और वही is_legal_admin_verified बदल सकता है। Admin के wallet connect करने के बाद वही on-chain grantRole(UNIVERSITY_ROLE, ...) transaction sign करता है।",
          ],
          [
            "university-admin",
            "University Admin",
            "जारी करने वाली संस्था का प्रतिनिधि। Student submissions की समीक्षा करता है, MetaMask के ज़रिए EVM wallet connect करता है (EIP-55 checksum-normalised), और on-chain mint sign करता है। Issue होने के बाद credentials revoke भी कर सकता है।",
          ],
          [
            "student",
            "Student",
            "अपनी registered college के लिए degree PDF और metadata (course, grade, year) submit करता है। Admin के mint करने के बाद छात्र अपने dashboard पर on-chain token id और transaction hash देखता है।",
          ],
          [
            "employer",
            "Employer",
            "कोई account आवश्यक नहीं। /verify पर छात्र का PRN (या email) दर्ज करता है और SBT token id तथा issuing university सहित authoritative response प्राप्त करता है।",
          ],
        ],
      },
      walkthroughs: {
        kicker: "वॉकथ्रू",
        title: "एंड-टू-एंड फ्लो",
        summary:
          "हर प्रमुख user journey के लिए concrete और copy-paste करने योग्य walkthroughs। हर flow में शामिल exact endpoints और contract calls दिए गए हैं।",
        sections: {
          registration: {
            title: "रजिस्टर और ऑनबोर्ड",
            items: [
              "/register खोलें।",
              "एक role चुनें (Student या University Admin)।",
              "Students उस dropdown से college चुनते हैं जो GET /api/v1/users/universities से populate होती है।",
              "Admins अतिरिक्त रूप से POST /api/v1/auth/{user_id}/verification-document के माध्यम से verification PDF upload करते हैं।",
              "जब तक Super Admin approve न करे, admins को /pending-verification पर redirect किया जाता है।",
            ],
          },
          adminApproval: {
            title: "Admin approval",
            items: [
              "Super Admin /superadmin पर जाता है।",
              "Pending admin खोलकर PDF review करता है।",
              "Approve पर क्लिक करता है -> backend POST /api/v1/users/verify-admin/{id} कॉल करता है।",
              "अगर admin का wallet पहले से connected है, तो backend grantRole(UNIVERSITY_ROLE, wallet) भी on-chain submit करता है।",
            ],
          },
          connectWallet: {
            title: "Wallet connect करें",
            items: [
              "Verified admin /university खोलता है।",
              "Connect Wallet पर क्लिक करता है - Reown AppKit MetaMask को Sepolia पर खोलता है।",
              "Frontend checksum address के साथ /api/v1/users/me/wallet पर PATCH करता है।",
              "Backend address save करता है और अगर role पहले से granted नहीं है, तो Registry पर addUniversity() कॉल करता है।",
            ],
            callout:
              "केवल EVM (0x-prefixed 20-byte hex) wallets स्वीकार किए जाते हैं। Schema validator Solana, Bitcoin और Cosmos addresses को सीधे reject कर देता है।",
          },
          studentSubmission: { title: "Student submission" },
          mintSbt: {
            title: "SBT mint करें",
            items: [
              "Admin /university पर submission review करता है।",
              "Mint पर क्लिक करता है। Frontend ethers + MetaMask के ज़रिए AltriumDegreeSBT.mintDegree(studentWallet, metadataURI) कॉल करता है।",
              "सफल होने पर frontend status=MINTED, transaction hash और token id के साथ /api/v1/degrees/{id}/status पर PATCH करता है।",
              "Student /student पर minted credential को Sepolia explorer लिंक के साथ देखता है।",
            ],
          },
          employerVerification: {
            title: "Employer verification",
            intro: "Employers को register करने की ज़रूरत नहीं है। वे /verify खोलते हैं और PRN पेस्ट करते हैं।",
            note: "Student directory scraping रोकने के लिए इसे प्रति IP 30 requests/minute तक सीमित किया गया है।",
          },
          revokeDegree: {
            title: "डिग्री revoke करें",
            body:
              "अगर डिग्री गलती से जारी हुई है, तो admin dashboard से उसे revoke कर सकता है। इससे PATCH /api/v1/degrees/{id}/revoke ट्रिगर होता है, जो revoked=true सेट करता है और (वैकल्पिक रूप से) SBT को on-chain burn करता है। Record employers को दिखाई देता रहता है, जहाँ revoked flag साफ दिखता है।",
          },
        },
      },
      apiReference: {
        kicker: "API रेफरेंस",
        title: "HTTPS पर REST",
        summary:
          "हर Altrium endpoint, उसके role requirements और rate limits। Auto-generated OpenAPI docs /docs (Swagger) और /redoc पर उपलब्ध हैं।",
        sections: {
          overview: {
            title: "अवलोकन",
            body:
              "Development में Base URL: http://localhost:8000 है, और production में आपका hostname। सभी routes /api/v1 के तहत namespaced हैं। Responses JSON में आते हैं, सिवाय उस endpoint के जो binary लौटाता है (अभी केवल GET /degrees/{id}/document, जो application/pdf stream करता है)।",
          },
          authentication: {
            title: "Authentication",
            intro: "Bearer-token auth। लॉगिन के बाद हर protected request में access token शामिल करें:",
            body:
              "Access tokens ACCESS_TOKEN_EXPIRE_MINUTES (default 30) के बाद expire होते हैं। Refresh के लिए POST /api/v1/auth/refresh का उपयोग करें। Logout पर दोनों tokens MongoDB में blacklist किए जाते हैं, जहाँ TTL index प्रत्येक token के real exp से मेल खाता है।",
          },
          errors: {
            title: "Errors और rate limits",
            intro: "Errors FastAPI की convention का पालन करते हैं: { \"detail\": \"Message\" }.",
            codes: [
              ["400", "Validation failed"],
              ["401", "Missing / expired / blacklisted token"],
              ["403", "Role या verification check failed"],
              ["404", "Resource not found"],
              ["409", "Duplicate (जैसे PRN पहले से registered हो)"],
              ["429", "Rate limited"],
            ],
            note: "Auth: 5/min login, 10/min register, 30/min refresh। Public verification: 30/min। Uploads: 20/min।",
          },
          authEndpoints: {
            title: "Auth endpoints",
            items: [
              ["POST", "/api/v1/auth/register", "public · 10/min", "User बनाता है। Body: { email, password, full_name, role, college_name?, prn_number? }."],
              ["POST", "/api/v1/auth/login", "public · 5/min", "{ access_token, refresh_token, token_type } लौटाता है।"],
              ["POST", "/api/v1/auth/refresh", "public · 30/min", "Body: { refresh_token }। नया token pair लौटाता है।"],
              ["POST", "/api/v1/auth/forgot-password", "dev-only · 5/min", "Production में disabled। Account enumeration रोकने के लिए हमेशा 204 लौटाता है।"],
              ["POST", "/api/v1/auth/change-password", "Bearer · 10/min", "Body: { old_password, new_password }। सफलता पर 204।"],
              ["POST", "/api/v1/auth/{user_id}/verification-document", "Bearer · 20/min", "Admin verification PDF का multipart upload। Caller स्वयं user या Super Admin होना चाहिए।"],
              ["POST", "/api/v1/auth/logout", "Bearer", "Header के access token और body के refresh token, दोनों को blacklist करता है।"],
            ],
          },
          usersEndpoints: {
            title: "Users endpoints",
            items: [
              ["GET", "/api/v1/users/universities", "public", "कम से कम एक verified admin वाले college names की unique list।"],
              ["GET", "/api/v1/users/me", "Bearer", "वर्तमान user की profile लौटाता है।"],
              ["GET", "/api/v1/users/", "Verified admin", "सभी users लौटाता है। Admin dashboard में उपयोग होता है।"],
              ["POST", "/api/v1/users/verify-admin/{user_id}", "Super Admin", "is_legal_admin_verified=true सेट करता है और wallet connected होने पर UNIVERSITY_ROLE on-chain grant करता है।"],
              ["PATCH", "/api/v1/users/me/wallet", "Verified admin", "Body: { wallet_address }। Checksum-normalised करके Registry पर addUniversity() के माध्यम से भेजा जाता है।"],
              ["GET", "/api/v1/users/my-students", "Verified admin", "Admin के college में enrolled सभी students लौटाता है।"],
              ["DELETE", "/api/v1/users/{user_id}", "Super Admin", "User को hard-delete करता है। 204 लौटाता है।"],
            ],
          },
          degreesEndpoints: {
            title: "Degrees endpoints",
            items: [
              ["POST", "/api/v1/degrees/", "Student", "Submission बनाता है (status शुरुआत में PENDING होती है)।"],
              ["GET", "/api/v1/degrees/", "Bearer", "Caller के scope वाले credentials लौटाता है - students अपने, admins अपने college के, superadmin सभी देखते हैं।"],
              ["GET", "/api/v1/degrees/public", "public · 30/min", "Query param: prn_number। कोई auth नहीं - employer path।"],
              ["GET", "/api/v1/degrees/{credential_id}", "Bearer", "Single credential, list endpoint जैसा permission scope।"],
              ["PATCH", "/api/v1/degrees/{credential_id}/status", "Admin + wallet", "Body: नया CredentialStatus। On-chain mint सफल होने के बाद उपयोग होता है।"],
              ["PATCH", "/api/v1/degrees/{credential_id}", "Admin + wallet", "Fields अपडेट करता है (जैसे tx_hash, sbt_token_id)।"],
              ["DELETE", "/api/v1/degrees/{credential_id}", "Admin + wallet", "Credential को hard-delete करता है।"],
              ["PATCH", "/api/v1/degrees/{credential_id}/revoke", "Admin + wallet", "जारी credential को revoked के रूप में mark करता है।"],
              ["POST", "/api/v1/degrees/{credential_id}/reset", "Admin + wallet", "On-chain burn के बाद submission को PENDING पर reset करता है (test phase)।"],
              ["POST", "/api/v1/degrees/{credential_id}/document", "Bearer · 20/min", "Degree PDF का multipart upload। केवल owning student या उसका admin upload कर सकता है।"],
              ["GET", "/api/v1/degrees/{credential_id}/document", "Bearer", "अनुमति होने पर on-chain-audit footer watermark के साथ PDF stream करता है।"],
            ],
          },
        },
      },
      smartContracts: {
        kicker: "स्मार्ट कॉन्ट्रैक्ट्स",
        title: "Sepolia पर Solidity",
        summary:
          "Altrium के on-chain हिस्से को दो contracts चलाते हैं: Registry तय करती है कि कौन से wallets credentials issue कर सकते हैं, और Degree SBT उन्हें mint तथा revoke करता है।",
        sections: {
          registry: {
            title: "AltriumRegistry",
            body:
              "OpenZeppelin AccessControl wrapper जो approved universities की canonical list रखता है। Deployer के पास DEFAULT_ADMIN_ROLE होता है; verified admin wallets के पास UNIVERSITY_ROLE होता है।",
          },
          sbt: {
            title: "AltriumDegreeSBT",
            body:
              "ERC-721 जहाँ हर transfer path revert कर दिया गया है - एक सच्चा Soulbound Token। केवल वे addresses mint कर सकते हैं जिनके पास Registry पर UNIVERSITY_ROLE है।",
          },
          deployment: {
            title: "Deployment",
            body:
              "Deployment के बाद deployer wallet को हर approved admin के लिए addUniversity(adminWallet) कॉल करना होता है। Backend इसे automate करता है जब Super Admin ऐसे admin पर Approve क्लिक करता है जिसका wallet पहले से file में है।",
          },
          events: {
            title: "Events",
            body: "दोनों contracts ऐसे events emit करते हैं जिन्हें analytics या webhooks के लिए index किया जा सकता है:",
          },
        },
      },
      security: {
        kicker: "सुरक्षा",
        title: "बहु-स्तरीय सुरक्षा",
        summary:
          "Altrium authentication, authorisation, upload hygiene और strict transport headers की परतें जोड़ता है। On-chain mint अंतिम integrity anchor है - backend चुपचाप credential forge नहीं कर सकता।",
        sections: {
          securityModel: {
            title: "सुरक्षा मॉडल",
            items: [
              "हर mutating endpoint को valid JWT चाहिए और वह RBAC dependency से गुजरता है।",
              "On-chain mint source of truth है - compromised backend भी UNIVERSITY_ROLE के बिना credential forge नहीं कर सकता।",
              "Uploads को disk पर जाने से पहले content-sniff, magic-byte validation और size-cap से गुजारा जाता है।",
              "Strict security headers (CSP, X-Frame-Options, Referrer-Policy, HSTS) middleware के जरिए लगाए जाते हैं।",
            ],
          },
          jwt: {
            title: "JWT और sessions",
            body:
              "HS256, 30-minute access tokens, 7-day refresh tokens। Logout पर दोनों JWTs BlacklistedToken collection में तब तक रखे जाते हैं जब तक उनका वास्तविक exp समय न आ जाए; MongoDB TTL index उन्हें स्वतः साफ कर देता है।",
          },
          rbac: {
            title: "RBAC",
            intro: "पाँच FastAPI dependencies role checks लागू करती हैं:",
            items: [
              "get_current_user - कोई भी authenticated user",
              "require_role(UserRole.X) - exact role match",
              "require_verified_admin - role=ADMIN + is_legal_admin_verified",
              "require_admin_with_wallet - verified admin + file में wallet",
              "Superadmin checks require_role(SUPERADMIN) का उपयोग करते हैं",
            ],
          },
          pdfValidation: {
            title: "PDF validation",
            intro: "app/services/pdf_validation.py यह लागू करता है:",
            items: [
              "Exact magic-byte prefix %PDF-",
              "Maximum file size (default 10 MB)",
              "MIME header application/pdf होना चाहिए",
              "Student-facing copies के download पर metadata stripped होता है",
            ],
          },
          rateLimits: {
            title: "Rate limits",
            body: "Sensitive routes पर per-IP rate limits slowapi के जरिए लागू होती हैं। पूरी table के लिए API reference देखें।",
          },
        },
      },
      operations: {
        kicker: "ऑपरेशंस",
        title: "Production में Altrium चलाना",
        summary:
          "localhost से आगे बढ़ने के बाद environments, logging और database के बारे में जो कुछ जानना ज़रूरी है।",
        sections: {
          environments: {
            title: "Environments",
            body:
              "ENVIRONMENT env var (dev, staging, prod), app/main.py में boot-time guard को नियंत्रित करता है, जो unsafe combinations पर start होने से मना करता है (जैसे prod में ALLOW_SELF_SERVE_PASSWORD_RESET=true)।",
          },
          logs: {
            title: "Logs और observability",
            body:
              "Structured JSON logs stdout पर जाते हैं; request_id (middleware द्वारा injected) से उन्हें correlate करें। Production में इन्हें किसी भी logs sink (Datadog, CloudWatch, Loki आदि) को forward करें।",
          },
          database: {
            title: "डेटाबेस",
            intro: "Beanie द्वारा startup पर बनाए गए indexes:",
            items: [
              "User.email - unique",
              "User.prn_number - unique, sparse",
              "Credential.student_id",
              "BlacklistedToken.expires_at - TTL",
            ],
          },
          backups: {
            title: "Backups",
            body:
              "क्योंकि chain हर credential के लिए cryptographic anchor स्टोर करती है, इसलिए Mongo snapshot restore करने से history फिर से नहीं लिखी जाती - chain authoritative रूप से बताती है कि token अभी भी मौजूद है या नहीं। Uploads directory का अलग से backup लें; वहीं original PDFs रखे होते हैं।",
          },
        },
      },
      cli: {
        kicker: "CLI और Scripts",
        title: "पावर टूल्स",
        summary:
          "Backend के seeding और introspection scripts, साथ ही Foundry commands जिनकी ज़रूरत contracts पर काम करते समय पड़ती है।",
        sections: {
          backendScripts: { title: "Backend scripts" },
          foundryCommands: { title: "Foundry commands" },
          dockerHelpers: { title: "Docker helpers" },
        },
      },
      support: {
        kicker: "सपोर्ट",
        title: "समस्या सुलझाएँ",
        summary:
          "सबसे आम समस्याओं के लिए troubleshooting, FAQ और वे चैनल जहाँ आपको मदद मिल सकती है।",
        sections: {
          troubleshooting: {
            title: "Troubleshooting",
            items: [
              ["MetaMask गलत network पर अटका है.", "सुनिश्चित करें कि आप Sepolia (chain id 0xaa36a7) पर हैं। App connect के समय network switch request करता है।"],
              ["Mint transaction revert हो रही है.", "संभव है admin wallet के पास UNIVERSITY_ROLE न हो। Super Admin को फिर से approve करना होगा, या deployer wallet को addUniversity() मैन्युअली कॉल करना होगा।"],
              ["हर request पर 401 आ रहा है.", "Token expire हो चुका है। /api/v1/auth/refresh कॉल करें या फिर से लॉगिन करें।"],
              ["Upload reject हो रहा है.", "File या तो PDF नहीं है, corrupted है, या 10 MB से बड़ी है।"],
              ["Docker port उपयोग में है.", "Local Mongo/Vite/Uvicorn बंद करें या docker-compose.yml संपादित करें।"],
            ],
          },
          faq: {
            title: "FAQ",
            items: [
              ["क्या employer को wallet चाहिए?", "नहीं। Verification एक plain HTTP GET है - न keys, न login।"],
              ["क्या student अपना SBT बेच या transfer कर सकता है?", "नहीं। Contract स्तर पर transfers revert होते हैं - यही इसे soulbound बनाता है।"],
              ["यह किस chain पर है?", "Sepolia testnet। Architecture chain-agnostic है; Polygon या किसी L2 पर जाने के लिए केवल दो contracts redeploy करने और env vars अपडेट करने की ज़रूरत है।"],
              ["Personal data कैसे संभाला जाता है?", "केवल न्यूनतम जानकारी - name, email, PRN, college और degree PDF। On-chain केवल opaque metadata URI और student wallet लिखा जाता है।"],
              ["क्या API stable है?", "/api/v1 prefix वर्तमान major को दर्शाता है। Breaking changes कम से कम एक minor overlap के साथ /api/v2 पर जाएँगी।"],
            ],
          },
          contact: {
            title: "संपर्क और समुदाय",
            items: [
              "GitHub issues",
              "Security reports: सार्वजनिक issue खोलने के बजाय maintainers को email करें।",
              "Web3 help",
            ],
          },
        },
      },
      comingSoon: {
        bulkUploadWizard: {
          title: "Bulk Upload Wizard",
          tagline:
            "पूरे graduating cohort को एक guided import में issue करें - CSV या XLSX अंदर, queued submissions बाहर।",
          intro:
            "अभी admins submissions एक-एक करके बनाते हैं। Bulk Upload Wizard विश्वविद्यालय को roster file upload करने, inline validation के साथ parse preview देखने, row-level errors वहीं ठीक करने और queued batch शुरू करने देगा जो सामान्य mint flow को feed करेगा। Students को फिर भी अपना अलग credential और SBT मिलेगा - बस प्रति row मेहनत कम होगी।",
          features: [
            "XLSX, CSV और Google Sheets exports के लिए drop-in support।",
            "Live row-level validation: PRN format, duplicate detection, missing fields।",
            "Dry-run preview जो कुछ भी लिखने से पहले existing students के against diff दिखाता है।",
            "Idempotent batches - वही file दोबारा upload करने पर student दोबारा create नहीं होगा।",
            "Verification fail होने वाली rows के लिए retry controls के साथ progress dashboard।",
            "Trusted, pre-verified rosters के लिए review step छोड़ने हेतु optional auto-approve।",
          ],
        },
        emailService: {
          title: "Email Service",
          tagline:
            "Transactional notifications और templated mail - registration confirmations से mint receipts तक - एक pluggable provider के साथ।",
          intro:
            "Altrium के current flows मानते हैं कि student और admin app के सामने बैठे हैं। आने वाली Email Service हर प्रमुख event के लिए signed, branded messages भेजेगी: registration, approval decisions, Etherscan links के साथ mint confirmations, revocation notices और password resets। Providers (SES, Postmark, Resend या SMTP) एक single interface के पीछे plug in होंगे।",
          features: [
            "Registration, approval, mint, revoke और password reset के लिए signed, template-driven emails।",
            "Pluggable transport: SES, Postmark, Resend या raw SMTP, एक env flag के साथ।",
            "Altrium brand system के साथ per-template dark/light renders।",
            "Exponential backoff के साथ delivery retries और Super Admin को दिखने वाली dead-letter queue।",
            "Bounce/complaint handling के लिए webhook ingress - hard-bounce होने वाले addresses auto-suppress होंगे।",
            "हर भेजे गए message का audit log, user और event type दोनों के scope में।",
          ],
        },
        languageSupport: {
          title: "Language & Script Support",
          tagline:
            "App surface के लिए full i18n और issued credentials पर non-Latin script rendering - ताकि छात्र का नाम बिल्कुल उसी तरह दिखे जैसा उसके government ID पर है।",
          intro:
            "Altrium एक first-class localisation pipeline देगा: ICU message format के ज़रिए per-locale translated UI strings, locale-aware date और number formatting, और सबसे महत्वपूर्ण - minted credential PDF और watermark footer के अंदर Devanagari, Cyrillic, CJK, Arabic तथा अन्य non-Latin scripts की सही rendering। Right-to-left layouts का end-to-end support भी होगा।",
          features: [
            "App shell, dashboards और error messages के लिए ICU-based translations।",
            "Per-user locale preference (registration के दौरान सेट, profile से बदलने योग्य)।",
            "Automatic fallback chain - जैसे hi-IN -> hi -> en - ताकि partial translations UI को कभी न तोड़ें।",
            "Credentials के लिए non-Latin-capable PDF renderer - Devanagari, Cyrillic, CJK, Arabic, Hebrew।",
            "Arabic और Hebrew के लिए RTL layout support, बिना manual CSS overrides के।",
            "Contributor workflow: locale JSON files पर pull requests, schema linter से gate-check की जाएँगी।",
          ],
        },
      },
    },
  },
  mr: {
    shared: {
      copy: "कॉपी करा",
      copied: "कॉपी झाले",
      copyCode: "कोड कॉपी करा",
      linkToSection: (title: string) => `${title} विभागाची लिंक`,
      note: "टीप",
      warning: "इशारा",
      comingSoon: "लवकरच येत आहे",
      notYetShipped: "अजून प्रकाशित झालेले नाही",
      plannedForNextRelease: "पुढील मोठ्या रिलीजसाठी नियोजित.",
      whatsPlanned: "काय नियोजित आहे",
      plannedApiSurface: "नियोजित API पृष्ठभाग",
      stayInTheLoop: "अपडेटमध्ये रहा",
      followProgress:
        "GitHub वर प्रगती पाहा - milestones आणि changelog नोंदी सर्वप्रथम तिथेच येतात.",
      backToDocsHome: "Docs मुखपृष्ठावर परत जा",
    },
    pages: {
      introduction: {
        kicker: "परिचय",
        title: "Altrium म्हणजे काय?",
        summary:
          "पूर्ण-स्टॅक, ब्लॉकचेन-आधारित degree-verification प्लॅटफॉर्म. विद्यापीठे Ethereum Sepolia वर Soulbound Tokens (SBTs) म्हणून छेडछाड-प्रतिरोधक academic credentials जारी करतात; employers काही सेकंदांत त्यांची पडताळणी करू शकतात - मध्यस्थ नाहीत, बनावटपणा नाही, फोन कॉल नाहीत.",
        sections: {
          atAGlance: {
            title: "थोडक्यात",
            cards: [
              ["फ्रंटएंड", "React 18 + TypeScript, Vite, Tailwind, Reown AppKit, ethers v6."],
              ["बॅकएंड", "FastAPI (async), Pydantic v2, Beanie ODM on MongoDB."],
              ["ब्लॉकचेन", "Solidity 0.8.x, Foundry, OpenZeppelin, Sepolia testnet."],
              ["इन्फ्रा", "Docker Compose - एका command ने mongo, backend आणि frontend सुरू होतात."],
            ],
          },
          whyBlockchain: {
            title: "ब्लॉकचेन credentials का?",
            items: [
              ["अपरिवर्तनीय मूळ.", "एकदा mint झाल्यावर degree record गुपचूप बदलता किंवा हटवता येत नाही."],
              ["हस्तांतरण न होणारे (soulbound).", "SBTs विकता किंवा भेट देता येत नाहीत - credential नेहमी मूळ विद्यार्थ्याचाच राहतो."],
              ["सार्वजनिक पडताळणी.", "कोणताही employer सार्वजनिक API query करून किंवा chain वाचून login शिवाय credential तपासू शकतो."],
              ["जारीकर्त्याकडून revoke होऊ शकते.", "Degree चुकून जारी झाली असल्यास issuing university ती on-chain revoke करू शकते - audit trail जतन राहते."],
            ],
          },
          keyConcepts: {
            title: "मुख्य संकल्पना",
            items: [
              ["PRN (Permanent Registration Number)", "विद्यार्थ्याची canonical ओळख. Employers PRN वरून पडताळणी करतात."],
              ["SBT", "Soulbound Token. Transfer disabled असलेले ERC-721-style credential."],
              ["UNIVERSITY_ROLE", "Registry कडून दिले जाणारे on-chain role. फक्त holders degree mint करू शकतात."],
              ["Verified Admin", "ज्याची off-chain identity Super Admin ने approve केलेली आहे असा University Admin."],
            ],
          },
          whoIsThisFor: {
            title: "हे docs कोणासाठी आहेत?",
            items: [
              ["Operators", "विद्यापीठ किंवा consortium साठी Altrium deploy करणारे."],
              ["Integrators", "Public verification endpoint ला HR किंवा ATS tooling मध्ये जोडणारे."],
              ["Contributors", "Contracts, backend किंवा UI विस्तार करणारे."],
              ["Auditors", "Production वापराआधी security posture तपासणारे."],
            ],
          },
        },
      },
      quickstart: {
        kicker: "क्विकस्टार्ट",
        title: "15 मिनिटांत Altrium चालवा",
        summary:
          "ही guide तुमच्या मशीनवर संपूर्ण stack उभी करते - MongoDB, FastAPI backend, Vite dev server आणि Sepolia-connected frontend - तेही एका Docker Compose फाइलमागे.",
        sections: {
          prerequisites: {
            title: "पूर्वअटी",
            items: [
              "Docker आणि Docker Compose (शिफारस), किंवा",
              "Node.js 18+, Python 3.11+, npm, MongoDB 6+",
              "Sepolia ETH ने funded MetaMask wallet",
              "Infura / Alchemy Sepolia RPC URL",
            ],
          },
          installWithDocker: {
            title: "Docker वापरून इंस्टॉल करा",
            body:
              "Compose एका command मध्ये MongoDB, FastAPI backend आणि Vite dev server सुरू करते. Logs terminal मध्ये stream होतात; Ctrl+C ने तिन्ही services व्यवस्थित बंद होतात.",
          },
          manualInstall: { title: "मॅन्युअल इंस्टॉल" },
          environment: {
            title: "Environment variables",
            backendLabel: "backend/.env तयार करा:",
            frontendLabel: "frontend/.env तयार करा:",
          },
          checklist: {
            title: "पहिल्या रनची चेकलिस्ट",
            items: [
              "http://localhost:5173 उघडा - landing page लोड झाली पाहिजे.",
              "Super Admin म्हणून register करा (पहिला registered superadmin auto-approved असतो).",
              "University Admin account तयार करा आणि verification PDF upload करा.",
              "Super Admin म्हणून login करा आणि admin approve करा.",
              "Admin म्हणून Sepolia वर MetaMask connect करा - यामुळे on-chain addUniversity call trigger होते.",
              "Student म्हणून register करा, degree submit करा आणि admin कडून mint करून घ्या.",
              "कोणत्याही browser मधून /verify उघडा आणि PRN ने शोधा.",
            ],
          },
        },
      },
      architecture: {
        kicker: "आर्किटेक्चर",
        title: "Altrium एकत्र कसे काम करते",
        summary:
          "चार स्तर - React frontend, FastAPI backend, MongoDB store आणि Solidity contracts - एक REST interface आणि दोन on-chain contracts वर एकत्र काम करतात.",
        sections: {
          stackOverview: {
            title: "स्टॅकचा आढावा",
            cards: [
              ["फ्रंटएंड", "React 18 + TypeScript, Vite, Tailwind, Reown AppKit, ethers v6."],
              ["बॅकएंड", "FastAPI (async), Pydantic v2, Beanie ODM, slowapi rate limiting."],
              ["डेटाबेस", "MongoDB 6 (document store, blacklisted tokens साठी TTL index)."],
              ["ऑथ", "JWT access + refresh tokens, bcrypt password hashing, RBAC."],
              ["ब्लॉकचेन", "Solidity 0.8.x, Foundry, OpenZeppelin AccessControl, Sepolia."],
              ["इन्फ्रा", "Docker Compose - तीन services: mongo, backend, frontend."],
            ],
          },
          dataModel: {
            title: "डेटा मॉडेल",
            intro: "संपूर्ण domain दोन मुख्य collections वर चालतो:",
          },
          requestFlow: {
            title: "Request flow - degree mint करणे",
            body:
              "एक mint request चारही स्तरांमधून जाते. React app MetaMask कडून on-chain transaction sign करवते; backend resulting hash आणि token id साठवते; contract DegreeMinted event emit करतो; त्यानंतर कोणताही employer public endpoint किंवा chain वाचून SBT verify करू शकतो.",
          },
          trustBoundary: {
            title: "Trust boundary",
            body:
              "On-chain mint हे system चे source of truth आहे. Registry contract वर UNIVERSITY_ROLE नसताना पूर्णपणे compromised backend सुद्धा credential forge करू शकत नाही. उलट, off-chain state - PDF documents, pending submissions आणि employers ना दिसणारे revocation metadata - यासाठी backend source of truth आहे.",
          },
        },
      },
      roles: {
        kicker: "वापरकर्ता भूमिका",
        title: "कोण काय करतो",
        summary:
          "Altrium on-chain authority (फक्त university wallets mint करू शकतात) आणि off-chain identity (Super Admin ठरवतो की कोण university wallet बनेल) वेगळी ठेवते. चार भूमिका, आणि प्रत्येकाची मर्यादित जबाबदारी.",
        items: [
          [
            "superadmin",
            "Super Admin",
            "Platform operator. University Admin registration requests approve किंवा reject करतो, कोणताही user delete करू शकतो आणि is_legal_admin_verified बदलू शकणारी ही एकमेव भूमिका आहे. Admin ने wallet connect केल्यानंतर ही भूमिका on-chain grantRole(UNIVERSITY_ROLE, ...) transaction sign करते.",
          ],
          [
            "university-admin",
            "University Admin",
            "जारी करणाऱ्या संस्थेचे प्रतिनिधित्व करतो. Student submissions तपासतो, MetaMask द्वारे EVM wallet connect करतो (EIP-55 checksum-normalised), आणि on-chain mint sign करतो. Issuance नंतर credentials revoke करू शकतो.",
          ],
          [
            "student",
            "Student",
            "आपल्या registered college साठी degree PDF आणि metadata (course, grade, year) submit करतो. Admin mint केल्यानंतर student ला dashboard वर on-chain token id आणि transaction hash दिसतात.",
          ],
          [
            "employer",
            "Employer",
            "Account ची गरज नाही. /verify वर student चा PRN (किंवा email) टाकतो आणि SBT token id व issuing university सहित authoritative response मिळवतो.",
          ],
        ],
      },
      walkthroughs: {
        kicker: "वॉकथ्रू",
        title: "End-to-end flows",
        summary:
          "प्रत्येक मोठ्या user journey साठी ठोस आणि copy-paste करण्याजोगे walkthroughs. प्रत्येक flow मध्ये exact endpoints आणि contract calls दिल्या आहेत.",
        sections: {
          registration: {
            title: "Register आणि onboard",
            items: [
              "/register उघडा.",
              "Role निवडा (Student किंवा University Admin).",
              "Students, GET /api/v1/users/universities ने populate होणाऱ्या dropdown मधून college निवडतात.",
              "Admins अतिरिक्तपणे POST /api/v1/auth/{user_id}/verification-document द्वारे verification PDF upload करतात.",
              "Super Admin approve करेपर्यंत admins ना /pending-verification वर redirect केले जाते.",
            ],
          },
          adminApproval: {
            title: "Admin approval",
            items: [
              "Super Admin /superadmin वर जातो.",
              "Pending admin उघडतो आणि PDF review करतो.",
              "Approve क्लिक करतो -> backend POST /api/v1/users/verify-admin/{id} कॉल करतो.",
              "Admin चे wallet आधीपासून connected असल्यास backend grantRole(UNIVERSITY_ROLE, wallet) on-chain submit करतो.",
            ],
          },
          connectWallet: {
            title: "Wallet connect करा",
            items: [
              "Verified admin /university उघडतो.",
              "Connect Wallet क्लिक करतो - Reown AppKit MetaMask ला Sepolia वर उघडते.",
              "Frontend checksum address सह /api/v1/users/me/wallet वर PATCH करते.",
              "Backend address persist करते आणि role आधीपासून granted नसेल तर Registry वर addUniversity() कॉल करते.",
            ],
            callout:
              "फक्त EVM (0x-prefixed 20-byte hex) wallets स्वीकारले जातात. Schema validator Solana, Bitcoin आणि Cosmos addresses थेट reject करतो.",
          },
          studentSubmission: { title: "Student submission" },
          mintSbt: {
            title: "SBT mint करा",
            items: [
              "Admin /university वर submission review करतो.",
              "Mint क्लिक करतो. Frontend ethers + MetaMask द्वारे AltriumDegreeSBT.mintDegree(studentWallet, metadataURI) कॉल करते.",
              "यशस्वी झाल्यावर frontend status=MINTED, transaction hash आणि token id सह /api/v1/degrees/{id}/status वर PATCH करते.",
              "Student ला /student वर minted credential Sepolia explorer लिंकसह दिसते.",
            ],
          },
          employerVerification: {
            title: "Employer verification",
            intro: "Employers ना register करण्याची गरज नाही. ते /verify उघडतात आणि PRN paste करतात.",
            note: "Student directory scraping टाळण्यासाठी हे प्रति IP 30 requests/minute इतके मर्यादित आहे.",
          },
          revokeDegree: {
            title: "Degree revoke करा",
            body:
              "Degree चुकून जारी झाली असल्यास admin dashboard मधून ती revoke करू शकतो. यामुळे PATCH /api/v1/degrees/{id}/revoke trigger होते, जे revoked=true सेट करते आणि (पर्यायीरीत्या) SBT on-chain burn करते. Record employers ना दिसत राहतो, जिथे revoked flag स्पष्ट दिसतो.",
          },
        },
      },
      apiReference: {
        kicker: "API संदर्भ",
        title: "HTTPS वरील REST",
        summary:
          "प्रत्येक Altrium endpoint, त्याच्या role requirements आणि rate limits. Auto-generated OpenAPI docs /docs (Swagger) आणि /redoc वर उपलब्ध आहेत.",
        sections: {
          overview: {
            title: "आढावा",
            body:
              "Development मध्ये Base URL: http://localhost:8000 आहे, अन्यथा तुमचे production hostname. सर्व routes /api/v1 खाली namespaced आहेत. Responses JSON मध्ये असतात, फक्त binary देणारा endpoint वेगळा (सध्या फक्त GET /degrees/{id}/document, जो application/pdf stream करतो).",
          },
          authentication: {
            title: "Authentication",
            intro: "Bearer-token auth. Login नंतर प्रत्येक protected request मध्ये access token जोडा:",
            body:
              "Access tokens ACCESS_TOKEN_EXPIRE_MINUTES (default 30) नंतर expire होतात. Refresh साठी POST /api/v1/auth/refresh वापरा. Logout वेळी दोन्ही tokens MongoDB मध्ये blacklist केले जातात, जिथे TTL index प्रत्येक token च्या real exp शी जुळतो.",
          },
          errors: {
            title: "Errors आणि rate limits",
            intro: "Errors FastAPI च्या convention चे पालन करतात: { \"detail\": \"Message\" }.",
            codes: [
              ["400", "Validation failed"],
              ["401", "Missing / expired / blacklisted token"],
              ["403", "Role किंवा verification check failed"],
              ["404", "Resource not found"],
              ["409", "Duplicate (उदा. PRN आधीच registered आहे)"],
              ["429", "Rate limited"],
            ],
            note: "Auth: 5/min login, 10/min register, 30/min refresh. Public verification: 30/min. Uploads: 20/min.",
          },
          authEndpoints: {
            title: "Auth endpoints",
            items: [
              ["POST", "/api/v1/auth/register", "public · 10/min", "User तयार करतो. Body: { email, password, full_name, role, college_name?, prn_number? }."],
              ["POST", "/api/v1/auth/login", "public · 5/min", "{ access_token, refresh_token, token_type } परत करतो."],
              ["POST", "/api/v1/auth/refresh", "public · 30/min", "Body: { refresh_token }. नवीन token pair परत करतो."],
              ["POST", "/api/v1/auth/forgot-password", "dev-only · 5/min", "Production मध्ये disabled. Account enumeration टाळण्यासाठी नेहमी 204 परत करतो."],
              ["POST", "/api/v1/auth/change-password", "Bearer · 10/min", "Body: { old_password, new_password }. यशस्वी झाल्यास 204."],
              ["POST", "/api/v1/auth/{user_id}/verification-document", "Bearer · 20/min", "Admin verification PDF चे multipart upload. Caller स्वतः user किंवा Super Admin असणे आवश्यक आहे."],
              ["POST", "/api/v1/auth/logout", "Bearer", "Header मधील access token आणि body मधील refresh token blacklist करतो."],
            ],
          },
          usersEndpoints: {
            title: "Users endpoints",
            items: [
              ["GET", "/api/v1/users/universities", "public", "किमान एक verified admin असलेल्या college names ची unique यादी."],
              ["GET", "/api/v1/users/me", "Bearer", "सध्याच्या user ची profile परत करतो."],
              ["GET", "/api/v1/users/", "Verified admin", "सर्व users परत करतो. Admin dashboard साठी वापरले जाते."],
              ["POST", "/api/v1/users/verify-admin/{user_id}", "Super Admin", "is_legal_admin_verified=true सेट करतो आणि wallet connected असल्यास UNIVERSITY_ROLE on-chain grant करतो."],
              ["PATCH", "/api/v1/users/me/wallet", "Verified admin", "Body: { wallet_address }. Checksum-normalised करून Registry वर addUniversity() मार्फत पाठवले जाते."],
              ["GET", "/api/v1/users/my-students", "Verified admin", "Admin च्या college मधील सर्व students परत करतो."],
              ["DELETE", "/api/v1/users/{user_id}", "Super Admin", "User hard-delete करतो. 204 परत करतो."],
            ],
          },
          degreesEndpoints: {
            title: "Degrees endpoints",
            items: [
              ["POST", "/api/v1/degrees/", "Student", "Submission तयार करतो (status सुरुवातीला PENDING असते)."],
              ["GET", "/api/v1/degrees/", "Bearer", "Caller च्या scope मधील credentials परत करतो - students स्वतःचे, admins त्यांच्या college चे, superadmin सर्व पाहतात."],
              ["GET", "/api/v1/degrees/public", "public · 30/min", "Query param: prn_number. Auth लागत नाही - employer path."],
              ["GET", "/api/v1/degrees/{credential_id}", "Bearer", "Single credential, list endpoint सारख्या permission scope सह."],
              ["PATCH", "/api/v1/degrees/{credential_id}/status", "Admin + wallet", "Body: नवीन CredentialStatus. On-chain mint यशस्वी झाल्यावर वापरले जाते."],
              ["PATCH", "/api/v1/degrees/{credential_id}", "Admin + wallet", "Fields update करतो (उदा. tx_hash, sbt_token_id)."],
              ["DELETE", "/api/v1/degrees/{credential_id}", "Admin + wallet", "Credential hard-delete करतो."],
              ["PATCH", "/api/v1/degrees/{credential_id}/revoke", "Admin + wallet", "Issued credential revoked म्हणून mark करतो."],
              ["POST", "/api/v1/degrees/{credential_id}/reset", "Admin + wallet", "On-chain burn नंतर submission ला PENDING वर reset करतो (test phase)."],
              ["POST", "/api/v1/degrees/{credential_id}/document", "Bearer · 20/min", "Degree PDF चे multipart upload. फक्त owning student किंवा त्यांचा admin upload करू शकतो."],
              ["GET", "/api/v1/degrees/{credential_id}/document", "Bearer", "परवानगी असल्यास on-chain-audit footer watermark सह PDF stream करतो."],
            ],
          },
        },
      },
      smartContracts: {
        kicker: "स्मार्ट कॉन्ट्रॅक्ट्स",
        title: "Sepolia वर Solidity",
        summary:
          "Altrium च्या on-chain भागाला दोन contracts चालवतात: Registry कोणते wallets credentials issue करू शकतात हे नियंत्रित करते, आणि Degree SBT त्यांना mint आणि revoke करते.",
        sections: {
          registry: {
            title: "AltriumRegistry",
            body:
              "Approved universities ची canonical यादी ठेवणारे OpenZeppelin AccessControl wrapper. Deployer कडे DEFAULT_ADMIN_ROLE असते; verified admin wallets कडे UNIVERSITY_ROLE असते.",
          },
          sbt: {
            title: "AltriumDegreeSBT",
            body:
              "प्रत्येक transfer path revert केलेले ERC-721 - एक खरे Soulbound Token. Registry वर UNIVERSITY_ROLE असलेले addressesच mint करू शकतात.",
          },
          deployment: {
            title: "Deployment",
            body:
              "Deployment नंतर deployer wallet ने प्रत्येक approved admin साठी addUniversity(adminWallet) कॉल करणे आवश्यक आहे. Super Admin अशा admin वर Approve क्लिक करतो ज्याचे wallet आधीच नोंदलेले असते, तेव्हा backend हे automate करते.",
          },
          events: {
            title: "Events",
            body: "दोन्ही contracts असे events emit करतात ज्यांना analytics किंवा webhooks साठी index करता येते:",
          },
        },
      },
      security: {
        kicker: "सुरक्षा",
        title: "अनेक स्तरांवरील संरक्षण",
        summary:
          "Altrium authentication, authorisation, upload hygiene आणि strict transport headers यांच्या स्तरांचा वापर करते. On-chain mint हा अंतिम integrity anchor आहे - backend गुपचूप credentials forge करू शकत नाही.",
        sections: {
          securityModel: {
            title: "सुरक्षा मॉडेल",
            items: [
              "प्रत्येक mutating endpoint ला valid JWT लागतो आणि तो RBAC dependency मधून जातो.",
              "On-chain mint हे source of truth आहे - compromised backend सुद्धा UNIVERSITY_ROLE शिवाय credential forge करू शकत नाही.",
              "Uploads disk वर जाण्यापूर्वी content-sniffed, magic-byte-validated आणि size-capped केल्या जातात.",
              "Strict security headers (CSP, X-Frame-Options, Referrer-Policy, HSTS) middleware द्वारे लागू केले जातात.",
            ],
          },
          jwt: {
            title: "JWT आणि sessions",
            body:
              "HS256, 30-minute access tokens, 7-day refresh tokens. Logout वेळी दोन्ही JWTs BlacklistedToken collection मध्ये त्यांच्या real exp पर्यंत ठेवले जातात; MongoDB TTL index त्यांना आपोआप हटवते.",
          },
          rbac: {
            title: "RBAC",
            intro: "पाच FastAPI dependencies role checks enforce करतात:",
            items: [
              "get_current_user - कोणताही authenticated user",
              "require_role(UserRole.X) - exact role match",
              "require_verified_admin - role=ADMIN + is_legal_admin_verified",
              "require_admin_with_wallet - verified admin + file मध्ये wallet",
              "Superadmin checks साठी require_role(SUPERADMIN) वापरले जाते",
            ],
          },
          pdfValidation: {
            title: "PDF validation",
            intro: "app/services/pdf_validation.py खालील गोष्टी enforce करते:",
            items: [
              "Exact magic-byte prefix %PDF-",
              "Maximum file size (default 10 MB)",
              "MIME header application/pdf असणे आवश्यक",
              "Student-facing copies download करताना metadata stripped केली जाते",
            ],
          },
          rateLimits: {
            title: "Rate limits",
            body: "Sensitive routes वर per-IP rate limits slowapi मार्फत लागू होतात. संपूर्ण table साठी API reference पहा.",
          },
        },
      },
      operations: {
        kicker: "ऑपरेशन्स",
        title: "Production मध्ये Altrium चालवणे",
        summary:
          "localhost च्या पुढे गेल्यावर environments, logging आणि database बद्दल काय माहित असणे आवश्यक आहे.",
        sections: {
          environments: {
            title: "Environments",
            body:
              "ENVIRONMENT env var (dev, staging, prod) app/main.py मधील boot-time guard नियंत्रित करते, जे unsafe combinations सह start होण्यास नकार देते (उदा. prod मध्ये ALLOW_SELF_SERVE_PASSWORD_RESET=true).",
          },
          logs: {
            title: "Logs आणि observability",
            body:
              "Structured JSON logs stdout वर जातात; request_id (middleware ने injected) वापरून correlate करा. Production मध्ये त्यांना कोणत्याही logs sink कडे (Datadog, CloudWatch, Loki इ.) forward करा.",
          },
          database: {
            title: "डेटाबेस",
            intro: "Startup वेळी Beanie ने तयार केलेले indexes:",
            items: [
              "User.email - unique",
              "User.prn_number - unique, sparse",
              "Credential.student_id",
              "BlacklistedToken.expires_at - TTL",
            ],
          },
          backups: {
            title: "Backups",
            body:
              "Chain प्रत्येक credential साठी cryptographic anchor साठवते, त्यामुळे Mongo snapshot restore केल्याने history पुन्हा लिहिली जात नाही - token अजून अस्तित्वात आहे का हे chain अधिकारपूर्वक सांगते. Uploads directory चे वेगळे backup घ्या; तिथे original PDFs असतात.",
          },
        },
      },
      cli: {
        kicker: "CLI आणि Scripts",
        title: "पॉवर टूल्स",
        summary:
          "Backend seeding आणि introspection scripts, तसेच contracts वर काम करताना लागणाऱ्या Foundry commands.",
        sections: {
          backendScripts: { title: "Backend scripts" },
          foundryCommands: { title: "Foundry commands" },
          dockerHelpers: { title: "Docker helpers" },
        },
      },
      support: {
        kicker: "सपोर्ट",
        title: "अडथळे दूर करा",
        summary:
          "सर्वात सामान्य समस्यांसाठी troubleshooting, FAQ आणि मदत मिळू शकणारे channels.",
        sections: {
          troubleshooting: {
            title: "Troubleshooting",
            items: [
              ["MetaMask चुकीच्या network वर अडकले आहे.", "तुम्ही Sepolia (chain id 0xaa36a7) वर आहात याची खात्री करा. Connect वेळी app network switch request करते."],
              ["Mint transaction revert होते.", "Admin wallet कडे UNIVERSITY_ROLE नसण्याची शक्यता आहे. Super Admin ने पुन्हा approve करणे आवश्यक आहे, किंवा deployer wallet ने addUniversity() manually कॉल करणे आवश्यक आहे."],
              ["प्रत्येक request वर 401 येतो.", "Token expire झाला आहे. /api/v1/auth/refresh कॉल करा किंवा पुन्हा login करा."],
              ["Upload reject होते.", "File PDF नाही, corrupt आहे, किंवा 10 MB पेक्षा मोठी आहे."],
              ["Docker port वापरात आहे.", "Local Mongo/Vite/Uvicorn थांबवा किंवा docker-compose.yml संपादित करा."],
            ],
          },
          faq: {
            title: "FAQ",
            items: [
              ["Employer ला wallet लागतो का?", "नाही. Verification हा plain HTTP GET आहे - keys नाहीत, login नाही."],
              ["Student आपला SBT विकू किंवा transfer करू शकतो का?", "नाही. Contract level वर transfers revert होतात - म्हणूनच ते soulbound आहे."],
              ["हे कोणत्या chain वर आहे?", "Sepolia testnet. Architecture chain-agnostic आहे; Polygon किंवा एखाद्या L2 वर स्विच करण्यासाठी फक्त दोन contracts redeploy करून env vars update करावे लागतात."],
              ["Personal data कसे हाताळले जाते?", "फक्त minimum - name, email, PRN, college आणि degree PDF. On-chain फक्त opaque metadata URI आणि student wallet लिहिले जाते."],
              ["API stable आहे का?", "/api/v1 prefix current major दाखवते. Breaking changes कमीत कमी एका minor overlap सह /api/v2 वर जातील."],
            ],
          },
          contact: {
            title: "संपर्क आणि समुदाय",
            items: [
              "GitHub issues",
              "Security reports: सार्वजनिक issue उघडण्याऐवजी maintainers ना email करा.",
              "Web3 help",
            ],
          },
        },
      },
      comingSoon: {
        bulkUploadWizard: {
          title: "Bulk Upload Wizard",
          tagline:
            "संपूर्ण graduating cohort एका guided import मध्ये issue करा - CSV किंवा XLSX आत, queued submissions बाहेर.",
          intro:
            "आज admins submissions एकावेळी एक तयार करतात. Bulk Upload Wizard मुळे विद्यापीठ roster file upload करू शकेल, inline validation सह parse preview पाहू शकेल, row-level errors तिथेच दुरुस्त करू शकेल आणि queued batch सुरू करू शकेल जी नेहमीच्या mint flow ला feed करेल. Students ना त्यांचे स्वतंत्र credential आणि SBT तरीही मिळतील - फक्त प्रत्येक row साठीचा त्रास कमी होईल.",
          features: [
            "XLSX, CSV आणि Google Sheets exports साठी drop-in support.",
            "Live row-level validation: PRN format, duplicate detection, missing fields.",
            "काहीही write करण्यापूर्वी existing students विरुद्ध diff दाखवणारा dry-run preview.",
            "Idempotent batches - तीच file पुन्हा upload केल्यास student दोनदा create होत नाही.",
            "Verification fail झालेल्या rows साठी retry controls असलेला progress dashboard.",
            "Trusted, pre-verified rosters साठी review step skip करण्याचा optional auto-approve.",
          ],
        },
        emailService: {
          title: "Email Service",
          tagline:
            "Transactional notifications आणि templated mail - registration confirmations पासून mint receipts पर्यंत - pluggable provider सह.",
          intro:
            "Altrium चे सध्याचे flows गृहीत धरतात की student आणि admin app समोर आहेत. येणारी Email Service प्रत्येक महत्त्वाच्या event साठी signed, branded messages पाठवेल: registration, approval decisions, Etherscan links सह mint confirmations, revocation notices आणि password resets. Providers (SES, Postmark, Resend किंवा SMTP) एका single interface मागे plug in होतील.",
          features: [
            "Registration, approval, mint, revoke आणि password reset साठी signed, template-driven emails.",
            "Pluggable transport: SES, Postmark, Resend किंवा raw SMTP एका env flag ने.",
            "Altrium brand system सह per-template dark/light renders.",
            "Exponential backoff सह delivery retries आणि Super Admin ला दिसणारी dead-letter queue.",
            "Bounce/complaint handling साठी webhook ingress - hard-bounce addresses auto-suppress होतील.",
            "प्रत्येक पाठवलेल्या message चा audit log, user आणि event type नुसार scoped.",
          ],
        },
        languageSupport: {
          title: "Language & Script Support",
          tagline:
            "App surface साठी full i18n आणि issued credentials वर non-Latin script rendering - जेणेकरून विद्यार्थ्याचे नाव त्यांच्या government ID वर जसे आहे तसेच दिसेल.",
          intro:
            "Altrium एक first-class localisation pipeline देईल: ICU message format वापरून per-locale translated UI strings, locale-aware date आणि number formatting, आणि सर्वात महत्त्वाचे - minted credential PDF आणि watermark footer मध्ये Devanagari, Cyrillic, CJK, Arabic आणि इतर non-Latin scripts चे योग्य rendering. Right-to-left layouts ना end-to-end support असेल.",
          features: [
            "App shell, dashboards आणि error messages साठी ICU-based translations.",
            "Per-user locale preference (registration दरम्यान सेट, profile मधून बदलता येणारी).",
            "Automatic fallback chain - उदा. hi-IN -> hi -> en - जेणेकरून partial translations मुळे UI कधीही तुटणार नाही.",
            "Credentials साठी non-Latin-capable PDF renderer - Devanagari, Cyrillic, CJK, Arabic, Hebrew.",
            "Arabic आणि Hebrew साठी RTL layout support, manual CSS overrides शिवाय.",
            "Contributor workflow: locale JSON files विरुद्ध pull requests schema linter ने gate-check केल्या जातील.",
          ],
        },
      },
    },
  },
} as const;

export const useDocsContent = () => {
  const { i18n } = useTranslation();
  return docsContent[resolveDocsLanguage(i18n.resolvedLanguage)];
};
