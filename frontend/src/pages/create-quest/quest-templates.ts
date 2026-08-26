/**
 * Pre-built quest templates for common use cases.
 *
 * Templates are read-only seed data. When a user selects one, the wizard
 * deep-copies the template values into step1Data and step2Data via context —
 * the original objects are never mutated.
 */

import type { Step1Values } from "./types"

// ─── Milestone template (mirrors Step2Values milestone shape) ────────────────

export interface MilestoneTemplate {
  title: string
  description: string
  rewardAmount: number
}

// ─── Quest template ──────────────────────────────────────────────────────────

export type TemplateCategory = "course" | "bootcamp" | "skill-challenge"

export interface QuestTemplate {
  id: string
  category: TemplateCategory
  /** Short human-readable label for the category pill */
  categoryLabel: string
  /** Icon name (lucide) — rendered by the picker */
  icon: string
  name: string
  description: string
  tags: string[]
  /** Suggested reward per milestone; editable after applying */
  milestones: MilestoneTemplate[]
}

/** Derive step1 values from a template (no milestones — those go to step2) */
export function templateToStep1(t: QuestTemplate): Step1Values {
  return {
    name: t.name,
    description: t.description,
    category: t.categoryLabel,
    tags: [...t.tags],
  }
}

/** Derive step2 milestones from a template */
export function templateToMilestones(t: QuestTemplate): MilestoneTemplate[] {
  return t.milestones.map(m => ({ ...m }))
}

// ─── Template catalogue ───────────────────────────────────────────────────────

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // ── Courses ────────────────────────────────────────────────────────────────
  {
    id: "course-web-dev",
    category: "course",
    categoryLabel: "Programming",
    icon: "Code",
    name: "Web Development Fundamentals",
    description:
      "A structured introduction to full-stack web development. Learners go from HTML basics to shipping a deployed web application, earning rewards at every milestone.",
    tags: ["javascript", "html", "css", "beginner"],
    milestones: [
      {
        title: "HTML & CSS Basics",
        description:
          "Build a static webpage with semantic HTML and responsive CSS. Must include a header, navigation, content section, and footer.",
        rewardAmount: 50,
      },
      {
        title: "JavaScript Fundamentals",
        description:
          "Write a vanilla JS script that manipulates the DOM, handles user events, and fetches data from a public API.",
        rewardAmount: 75,
      },
      {
        title: "Build a REST API",
        description:
          "Create a Node.js/Express REST API with at least three endpoints, input validation, and error handling.",
        rewardAmount: 125,
      },
      {
        title: "Connect Frontend to Backend",
        description:
          "Wire your frontend to your API. Implement a form that submits data, displays results, and shows loading/error states.",
        rewardAmount: 150,
      },
      {
        title: "Deploy to Production",
        description:
          "Deploy the full-stack app to a cloud provider (Vercel, Railway, Render, or similar). Share a live URL.",
        rewardAmount: 200,
      },
    ],
  },
  {
    id: "course-python-data",
    category: "course",
    categoryLabel: "Data Science",
    icon: "BarChart2",
    name: "Python for Data Science",
    description:
      "Learn Python data science essentials — from NumPy arrays to training your first machine-learning model. Practical, hands-on milestones with real datasets.",
    tags: ["python", "data-science", "ml", "beginner"],
    milestones: [
      {
        title: "Python & Jupyter Setup",
        description:
          "Set up a virtual environment, install NumPy/Pandas/Matplotlib, and run a hello-world Jupyter notebook.",
        rewardAmount: 40,
      },
      {
        title: "Data Wrangling with Pandas",
        description:
          "Load a CSV dataset, clean missing values, filter rows, and produce a summary statistics table.",
        rewardAmount: 80,
      },
      {
        title: "Exploratory Data Analysis",
        description:
          "Create at least five visualizations (histograms, scatter plots, heatmaps) and write observations for each.",
        rewardAmount: 100,
      },
      {
        title: "Train a Classification Model",
        description:
          "Train a scikit-learn classifier, evaluate it with a confusion matrix, and achieve ≥ 80% accuracy on the test set.",
        rewardAmount: 150,
      },
      {
        title: "Present Findings",
        description:
          "Write a short report (Markdown or notebook) explaining your dataset, methodology, results, and what you'd improve next.",
        rewardAmount: 130,
      },
    ],
  },
  {
    id: "course-ui-design",
    category: "course",
    categoryLabel: "Design",
    icon: "Palette",
    name: "UI/UX Design Fundamentals",
    description:
      "Master the core principles of user interface and user experience design. From typography and color theory to building a polished component library in Figma.",
    tags: ["ui/ux", "figma", "design", "beginner"],
    milestones: [
      {
        title: "Design Principles",
        description:
          "Create a one-page reference sheet covering spacing systems, typography scales, and a 5-color palette with accessibility contrast ratios.",
        rewardAmount: 50,
      },
      {
        title: "Wireframes",
        description:
          "Design low-fidelity wireframes for a 3-page web app: landing, dashboard, and settings. Cover mobile and desktop breakpoints.",
        rewardAmount: 75,
      },
      {
        title: "Component Library",
        description:
          "Build a Figma component library with buttons, inputs, cards, and navigation — all using auto-layout and variants.",
        rewardAmount: 100,
      },
      {
        title: "High-Fidelity Prototype",
        description:
          "Produce a clickable high-fidelity prototype wiring the three screens. Conduct a 5-minute usability test and document findings.",
        rewardAmount: 125,
      },
    ],
  },

  // ── Bootcamps ──────────────────────────────────────────────────────────────
  {
    id: "bootcamp-stellar",
    category: "bootcamp",
    categoryLabel: "Blockchain",
    icon: "Zap",
    name: "Stellar Development Bootcamp",
    description:
      "An intensive bootcamp covering the full Stellar developer stack — from setting up the CLI to writing, testing, and deploying production-ready Soroban smart contracts.",
    tags: ["stellar", "soroban", "rust", "smart-contracts"],
    milestones: [
      {
        title: "Stellar CLI & Testnet Setup",
        description:
          "Install Stellar CLI, create a testnet account, fund it via Friendbot, and submit a successful account query.",
        rewardAmount: 100,
      },
      {
        title: "First Soroban Contract",
        description:
          "Write, test, and deploy a hello-world Soroban contract to testnet. Share the contract address.",
        rewardAmount: 200,
      },
      {
        title: "Token & Auth Patterns",
        description:
          "Build a contract that uses `require_auth()` for owner-only functions and interacts with the Stellar Asset Contract (SAC).",
        rewardAmount: 300,
      },
      {
        title: "Storage & TTL Management",
        description:
          "Implement Instance, Persistent, and Temporary storage in a contract. Write tests that verify TTL bump behavior.",
        rewardAmount: 250,
      },
      {
        title: "Multi-Contract System",
        description:
          "Design and deploy two contracts that interact — e.g., a registry contract and a data contract. Document the call flow.",
        rewardAmount: 350,
      },
      {
        title: "Security Review & Deploy",
        description:
          "Conduct a self-audit of your contracts against the Soroban security checklist. Deploy to testnet and write a deployment runbook.",
        rewardAmount: 400,
      },
    ],
  },
  {
    id: "bootcamp-fullstack",
    category: "bootcamp",
    categoryLabel: "Programming",
    icon: "Layers",
    name: "Full-Stack Web3 Bootcamp",
    description:
      "Eight-week bootcamp building a complete Web3 application from scratch — modern frontend, backend API, wallet integration, and on-chain contract calls.",
    tags: ["web3", "react", "typescript", "solidity"],
    milestones: [
      {
        title: "Project Setup & Tooling",
        description:
          "Scaffold a monorepo with a React/TypeScript frontend, a Node.js API, and a smart contract project. Configure linting, formatting, and CI.",
        rewardAmount: 100,
      },
      {
        title: "Smart Contract Core",
        description:
          "Write and test the core contract logic (e.g., ERC-20 token or simple DAO). Achieve 90%+ test coverage.",
        rewardAmount: 200,
      },
      {
        title: "Backend API",
        description:
          "Build a REST/GraphQL API that indexes on-chain events and exposes user data, balances, and transaction history.",
        rewardAmount: 250,
      },
      {
        title: "Frontend & Wallet Integration",
        description:
          "Build the React frontend with wallet connect, contract read/write calls, and a dashboard displaying live on-chain data.",
        rewardAmount: 300,
      },
      {
        title: "End-to-End Tests",
        description:
          "Write Playwright or Cypress E2E tests covering the critical user journey from connecting wallet to completing a transaction.",
        rewardAmount: 200,
      },
      {
        title: "Mainnet Launch",
        description:
          "Audit the contract, deploy to mainnet (or a public testnet), and complete a launch checklist. Write a post-mortem.",
        rewardAmount: 450,
      },
    ],
  },
  {
    id: "bootcamp-devops",
    category: "bootcamp",
    categoryLabel: "DevOps",
    icon: "Server",
    name: "DevOps Engineering Bootcamp",
    description:
      "Hands-on bootcamp covering the modern DevOps toolchain — containerisation, CI/CD pipelines, infrastructure as code, and production monitoring.",
    tags: ["devops", "docker", "kubernetes", "terraform"],
    milestones: [
      {
        title: "Containerise an App",
        description:
          "Write a multi-stage Dockerfile for an existing app. Build, run, and publish the image to a container registry.",
        rewardAmount: 100,
      },
      {
        title: "CI/CD Pipeline",
        description:
          "Set up a GitHub Actions pipeline that lints, tests, builds, and pushes a Docker image on every PR merge.",
        rewardAmount: 150,
      },
      {
        title: "Kubernetes Deployment",
        description:
          "Write Kubernetes manifests (Deployment, Service, Ingress). Deploy the app to a local cluster or managed Kubernetes.",
        rewardAmount: 200,
      },
      {
        title: "Infrastructure as Code",
        description:
          "Provision a cloud environment (VPC, compute, database) using Terraform or Pulumi. Store state remotely.",
        rewardAmount: 250,
      },
      {
        title: "Observability Stack",
        description:
          "Instrument the app with structured logs, metrics, and distributed traces. Set up dashboards and one alert.",
        rewardAmount: 200,
      },
    ],
  },

  // ── Courses (continued) ────────────────────────────────────────────────────
  {
    id: "course-smart-contracts",
    category: "course",
    categoryLabel: "Blockchain",
    icon: "Shield",
    name: "Smart Contract Development",
    description:
      "Learn to write, test, and deploy secure smart contracts from first principles. Covers contract architecture, state management, auth patterns, and real-world deployment.",
    tags: ["smart-contracts", "web3", "solidity", "security"],
    milestones: [
      {
        title: "Contract Basics",
        description:
          "Write a minimal smart contract with a state variable and two functions: one that writes and one that reads. Deploy to a local testnet.",
        rewardAmount: 60,
      },
      {
        title: "State & Storage Patterns",
        description:
          "Implement a contract with mappings, structs, and events. Write tests that verify state transitions and emitted events.",
        rewardAmount: 90,
      },
      {
        title: "Access Control",
        description:
          "Add role-based access control with an owner, an admin, and a regular user. Write tests for all three roles including unauthorized calls.",
        rewardAmount: 120,
      },
      {
        title: "Token Integration",
        description:
          "Integrate with an ERC-20 (or SAC) token: deposit, track balances per user, and allow withdrawal. Handle all edge cases with tests.",
        rewardAmount: 160,
      },
      {
        title: "Security Audit & Mainnet Deploy",
        description:
          "Run a self-audit against a standard smart contract security checklist. Fix any issues found. Deploy to a public testnet and write a deployment runbook.",
        rewardAmount: 200,
      },
    ],
  },

  // ── Bootcamps (continued) ──────────────────────────────────────────────────
  {
    id: "bootcamp-ai-ml",
    category: "bootcamp",
    categoryLabel: "AI / ML",
    icon: "Cpu",
    name: "Applied AI & Machine Learning Bootcamp",
    description:
      "An intensive hands-on bootcamp taking you from ML foundations to deploying a production model API. Covers data pipelines, model training, evaluation, and serving.",
    tags: ["ai", "machine-learning", "python", "pytorch"],
    milestones: [
      {
        title: "ML Environment & First Model",
        description:
          "Set up a Python ML environment (conda/venv), install PyTorch or TensorFlow, and train a linear regression model on a provided dataset. Submit a notebook with plots.",
        rewardAmount: 100,
      },
      {
        title: "Data Pipeline",
        description:
          "Build a reusable data pipeline that loads raw data, applies transformations, handles missing values, and splits into train/validation/test sets.",
        rewardAmount: 150,
      },
      {
        title: "Neural Network Training",
        description:
          "Design and train a neural network for classification. Implement early stopping and learning-rate scheduling. Achieve ≥ 85% validation accuracy.",
        rewardAmount: 200,
      },
      {
        title: "Experiment Tracking",
        description:
          "Integrate MLflow or Weights & Biases to log hyperparameters, metrics, and artifacts. Run at least three experiments and compare results.",
        rewardAmount: 175,
      },
      {
        title: "Model Evaluation & Bias Check",
        description:
          "Evaluate the final model with a full suite: confusion matrix, ROC-AUC, precision/recall. Perform a basic fairness analysis across demographic subgroups.",
        rewardAmount: 175,
      },
      {
        title: "Deploy a Model API",
        description:
          "Wrap the trained model in a FastAPI service with a prediction endpoint. Dockerise it, write a health check, and deploy to a cloud platform. Share the live URL.",
        rewardAmount: 300,
      },
    ],
  },

  // ── Skill Challenges ────────────────────────────────────────────────────────
  {
    id: "challenge-rust",
    category: "skill-challenge",
    categoryLabel: "Rust",
    icon: "Code2",
    name: "Rust 30-Day Challenge",
    description:
      "A focused 30-day challenge to go from Rust beginner to confident developer. Covers ownership, traits, async, and systems programming through a series of increasingly complex projects.",
    tags: ["rust", "systems", "challenge", "intermediate"],
    milestones: [
      {
        title: "Week 1 — Ownership & Borrowing",
        description:
          "Implement a linked list, a stack, and a simple key-value store using only safe Rust. Zero `clone()` calls in the core logic.",
        rewardAmount: 75,
      },
      {
        title: "Week 2 — Traits & Generics",
        description:
          "Build a generic event emitter library. Publish it as a crate with docs and pass `cargo clippy` with zero warnings.",
        rewardAmount: 100,
      },
      {
        title: "Week 3 — Async & Concurrency",
        description:
          "Write an async HTTP scraper using Tokio and Reqwest. Handle errors with `thiserror`, respect rate limits, and parse HTML.",
        rewardAmount: 125,
      },
      {
        title: "Week 4 — Final Project",
        description:
          "Build a CLI tool that combines the skills from weeks 1–3. Must include structured logging, a config file, and integration tests.",
        rewardAmount: 200,
      },
    ],
  },
  {
    id: "challenge-algo",
    category: "skill-challenge",
    categoryLabel: "Algorithms",
    icon: "Brain",
    name: "Algorithm & Data Structure Sprint",
    description:
      "A competitive sprint covering the most commonly tested algorithms and data structures. Solve progressively harder problems and benchmark your solutions.",
    tags: ["algorithms", "data-structures", "competitive", "intermediate"],
    milestones: [
      {
        title: "Arrays & Strings",
        description:
          "Solve 10 LeetCode-style problems on arrays and strings. Submit solutions with time/space complexity annotations.",
        rewardAmount: 50,
      },
      {
        title: "Trees & Graphs",
        description:
          "Implement BFS, DFS, and Dijkstra's algorithm from scratch. Solve 8 tree/graph problems and include test cases.",
        rewardAmount: 100,
      },
      {
        title: "Dynamic Programming",
        description:
          "Solve 8 classic DP problems (knapsack, LCS, coin change). Each solution must include a bottom-up approach.",
        rewardAmount: 150,
      },
      {
        title: "System Design",
        description:
          "Produce a written system design document for a URL shortener and a distributed cache. Include diagrams.",
        rewardAmount: 200,
      },
    ],
  },
  {
    id: "challenge-open-source",
    category: "skill-challenge",
    categoryLabel: "Open Source",
    icon: "GitMerge",
    name: "Open Source Contributor Challenge",
    description:
      "Level up your real-world contribution skills by shipping improvements to active open-source projects — from first issue to merged PR to maintainer recognition.",
    tags: ["open-source", "git", "community", "any-level"],
    milestones: [
      {
        title: "First Contribution",
        description:
          "Claim a 'good first issue' on any active open-source project. Open a PR that is reviewed and merged.",
        rewardAmount: 75,
      },
      {
        title: "Bug Fix with Tests",
        description:
          "Fix a confirmed bug in a project with 100+ stars. Your PR must include a regression test and be merged.",
        rewardAmount: 125,
      },
      {
        title: "Feature Addition",
        description:
          "Implement a requested feature. The PR must pass CI, include documentation, and be accepted by a maintainer.",
        rewardAmount: 200,
      },
      {
        title: "Documentation Overhaul",
        description:
          "Substantially improve the README, wiki, or API docs for a project. The maintainer must acknowledge the improvement.",
        rewardAmount: 100,
      },
    ],
  },
  {
    id: "challenge-security",
    category: "skill-challenge",
    categoryLabel: "Security",
    icon: "ShieldAlert",
    name: "Web Security & Ethical Hacking Sprint",
    description:
      "A focused sprint through the most critical web and application security concepts — OWASP Top 10, threat modelling, secure code review, and hands-on CTF-style challenges.",
    tags: ["security", "owasp", "ethical-hacking", "intermediate"],
    milestones: [
      {
        title: "OWASP Top 10 Research",
        description:
          "Write a one-page summary of each OWASP Top 10 vulnerability with a real-world example and one mitigation technique per item.",
        rewardAmount: 75,
      },
      {
        title: "Injection & XSS Labs",
        description:
          "Complete three guided labs: SQL injection, stored XSS, and command injection. For each, document the attack vector, payload, and the secure-code fix.",
        rewardAmount: 125,
      },
      {
        title: "Secure Code Review",
        description:
          "Review a provided codebase (~500 lines) for security issues. Submit a written report listing each finding with severity, line reference, and remediation.",
        rewardAmount: 150,
      },
      {
        title: "Threat Model a System",
        description:
          "Produce a STRIDE threat model for a simple web application (provided diagram). Identify at least eight threats and propose mitigations for each.",
        rewardAmount: 150,
      },
      {
        title: "CTF Challenge",
        description:
          "Complete a beginner-level Capture the Flag challenge (e.g., PicoCTF, HackTheBox Starting Point). Submit the final flag and a write-up explaining your approach.",
        rewardAmount: 200,
      },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** All distinct categories present in the catalogue */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["course", "bootcamp", "skill-challenge"]

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  course: "Course",
  bootcamp: "Bootcamp",
  "skill-challenge": "Skill Challenge",
}

/** Total reward for a template (sum of milestone rewardAmounts) */
export function templateTotalReward(t: QuestTemplate): number {
  return t.milestones.reduce((sum, m) => sum + m.rewardAmount, 0)
}
