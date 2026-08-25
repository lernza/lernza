/**
 * Pre-built quest templates for common learning use cases.
 *
 * Three categories:
 *   "course"    — self-paced learning paths, typically 4–6 milestones
 *   "bootcamp"  — intensive structured programs, typically 6–10 milestones
 *   "challenge" — focused skill sprints, typically 3–5 milestones
 *
 * All string lengths satisfy contract constraints (validated by schema in tests):
 *   name        ≤ 64 chars
 *   description ≤ 2000 chars
 *   category    ≤ 32 chars
 *   tag         ≤ 32 chars, max 5 tags
 *   milestone.title       ≤ 128 chars
 *   milestone.description ≤ 1000 chars
 *   milestone.rewardAmount > 0
 */

import type { Step1Values, Step2Values } from "./types"

export type TemplateCategory = "course" | "bootcamp" | "challenge"

export interface QuestTemplate {
  id: string
  category: TemplateCategory
  /** Short, human-readable display name */
  name: string
  /** One-sentence pitch shown in the template card */
  tagline: string
  /** Emoji icon used in the card header */
  icon: string
  /** Approximate duration shown as a badge */
  duration: string
  /** Filled into the quest "Basics" form on apply */
  step1: Step1Values
  /** Filled into the quest "Milestones" form on apply */
  step2: Step2Values
}

// ─── Courses ─────────────────────────────────────────────────────────────────

const WEB_DEV_FUNDAMENTALS: QuestTemplate = {
  id: "course-web-dev-fundamentals",
  category: "course",
  name: "Web Dev Fundamentals",
  tagline: "Take a learner from zero to their first deployed web app.",
  icon: "🌐",
  duration: "4–6 weeks",
  step1: {
    name: "Web Development Fundamentals",
    description:
      "A structured introduction to web development. Learners will master HTML, CSS, and JavaScript, then build and deploy a real-world project. Perfect for absolute beginners.",
    category: "Programming",
    tags: ["javascript", "web-dev", "beginner", "html", "css"],
  },
  step2: {
    milestones: [
      {
        title: "Build a Static HTML Page",
        description:
          "Create a multi-section HTML page with semantic markup, headings, paragraphs, images, and links. No styling required yet — focus on valid structure.",
        rewardAmount: 25,
      },
      {
        title: "Style with CSS",
        description:
          "Apply a stylesheet to your HTML page. Use flexbox or grid for layout, add colour, typography, and at least one responsive breakpoint.",
        rewardAmount: 50,
      },
      {
        title: "Add Interactivity with JavaScript",
        description:
          "Write a JS file that responds to at least two DOM events (e.g. button click, form submit). Manipulate the DOM and show feedback to the user.",
        rewardAmount: 75,
      },
      {
        title: "Build a Mini Project",
        description:
          "Combine HTML, CSS, and JS to build a small interactive app — a to-do list, quiz, or calculator. The project must be runnable in a browser with no build step.",
        rewardAmount: 100,
      },
      {
        title: "Deploy to Production",
        description:
          "Deploy your project to a public URL using Vercel, Netlify, or GitHub Pages. Share the live link as proof of completion.",
        rewardAmount: 150,
      },
    ],
  },
}

const UI_UX_DESIGN_COURSE: QuestTemplate = {
  id: "course-ui-ux-design",
  category: "course",
  name: "UI/UX Design Essentials",
  tagline: "Learn design thinking, Figma, and ship a real design system.",
  icon: "🎨",
  duration: "3–5 weeks",
  step1: {
    name: "UI/UX Design Essentials",
    description:
      "Learn the core principles of user interface and experience design. From wireframes and user flows to high-fidelity mockups and a component library — all in Figma.",
    category: "Design",
    tags: ["ui/ux", "figma", "design-systems", "beginner"],
  },
  step2: {
    milestones: [
      {
        title: "Create a User Persona",
        description:
          "Research a target user group and document a detailed persona — goals, pain points, demographics, and a quote. Deliver a Figma frame or PDF.",
        rewardAmount: 30,
      },
      {
        title: "Map a User Flow",
        description:
          "Draw a flow diagram for one core user journey (sign-up, checkout, or onboarding) with at least 6 decision points. Use FigJam or any diagramming tool.",
        rewardAmount: 50,
      },
      {
        title: "Design Low-Fidelity Wireframes",
        description:
          "Wireframe three screens of a mobile or web app using only greyscale shapes and placeholder text. Include navigation and at least one form.",
        rewardAmount: 75,
      },
      {
        title: "Build a Component Library",
        description:
          "Create a Figma component library with a colour palette, typography scale, spacing system, and at least 10 reusable components (button, input, card, etc.).",
        rewardAmount: 125,
      },
      {
        title: "Deliver a High-Fidelity Prototype",
        description:
          "Polish your wireframes into a complete high-fidelity, interactive prototype using your component library. Include at least one prototype flow users can click through.",
        rewardAmount: 200,
      },
    ],
  },
}

const DATA_SCIENCE_INTRO: QuestTemplate = {
  id: "course-data-science-intro",
  category: "course",
  name: "Intro to Data Science",
  tagline: "Python, pandas, and your first end-to-end ML model.",
  icon: "📊",
  duration: "5–7 weeks",
  step1: {
    name: "Intro to Data Science with Python",
    description:
      "A hands-on introduction to data science. Learn Python, data manipulation with pandas, data visualisation, and train your first machine-learning model on a real dataset.",
    category: "Data Science",
    tags: ["python", "pandas", "ml", "beginner", "data"],
  },
  step2: {
    milestones: [
      {
        title: "Python Foundations",
        description:
          "Complete exercises covering Python basics: variables, loops, functions, list comprehensions, and file I/O. Submit a .py file or Jupyter notebook.",
        rewardAmount: 40,
      },
      {
        title: "Data Wrangling with Pandas",
        description:
          "Load a CSV dataset, clean missing values, filter rows, group by categories, and compute summary statistics. Document your steps in a notebook.",
        rewardAmount: 75,
      },
      {
        title: "Exploratory Data Analysis",
        description:
          "Produce at least five charts (histogram, scatter, bar, heatmap, box plot) exploring a dataset of your choice. Write interpretations under each chart.",
        rewardAmount: 100,
      },
      {
        title: "Train a Classification Model",
        description:
          "Using scikit-learn, train a classifier (logistic regression or random forest) on a labelled dataset. Report accuracy, precision, recall, and confusion matrix.",
        rewardAmount: 150,
      },
      {
        title: "Present Your Findings",
        description:
          "Record a 5-minute video or write a 500-word report explaining your dataset, methodology, results, and at least two actionable insights.",
        rewardAmount: 200,
      },
    ],
  },
}

// ─── Bootcamps ───────────────────────────────────────────────────────────────

const STELLAR_DEV_BOOTCAMP: QuestTemplate = {
  id: "bootcamp-stellar-dev",
  category: "bootcamp",
  name: "Stellar Dev Bootcamp",
  tagline: "Intensive path from Stellar basics to a live Soroban dApp.",
  icon: "⭐",
  duration: "6–8 weeks",
  step1: {
    name: "Stellar Development Bootcamp",
    description:
      "An intensive, structured bootcamp for developers entering the Stellar/Soroban ecosystem. Covers accounts, transactions, smart contracts in Rust, and deploying a production dApp.",
    category: "Blockchain",
    tags: ["stellar", "soroban", "rust", "smart-contracts"],
  },
  step2: {
    milestones: [
      {
        title: "Set Up the Stellar Dev Environment",
        description:
          "Install Rust, the WASM target, and Stellar CLI. Fund a testnet account via Friendbot and confirm the balance using the Stellar SDK.",
        rewardAmount: 100,
      },
      {
        title: "Write Your First Soroban Contract",
        description:
          "Create, test, and deploy a 'Hello World' Soroban contract that accepts a name and returns a greeting. All unit tests must pass.",
        rewardAmount: 200,
      },
      {
        title: "Implement a Token Counter Contract",
        description:
          "Build a contract that increments a persistent counter and exposes get/set functions. Demonstrate TTL bumping and storage tier selection.",
        rewardAmount: 300,
      },
      {
        title: "Build an Asset Transfer Flow",
        description:
          "Write a contract that interacts with a Stellar Asset Contract (SAC). Implement deposit, withdraw, and balance-check functions with auth guards.",
        rewardAmount: 400,
      },
      {
        title: "Deploy a Frontend Integration",
        description:
          "Build a minimal React or vanilla JS frontend that connects Freighter, calls your contract's read functions, and signs a write transaction.",
        rewardAmount: 500,
      },
      {
        title: "Security Review & Audit Checklist",
        description:
          "Run clippy with deny(warnings), address all lint issues, and complete the standard Soroban security checklist: auth, integer overflow, reentrancy, event emission.",
        rewardAmount: 500,
      },
    ],
  },
}

const FULLSTACK_JS_BOOTCAMP: QuestTemplate = {
  id: "bootcamp-fullstack-js",
  category: "bootcamp",
  name: "Full-Stack JavaScript Bootcamp",
  tagline: "React, Node.js, databases, auth, and a shipped product.",
  icon: "🚀",
  duration: "8–10 weeks",
  step1: {
    name: "Full-Stack JavaScript Bootcamp",
    description:
      "A comprehensive bootcamp covering the modern JavaScript stack. Build and deploy a full-stack web application with React, Node/Express, PostgreSQL, authentication, and CI/CD.",
    category: "Programming",
    tags: ["javascript", "react", "node", "fullstack"],
  },
  step2: {
    milestones: [
      {
        title: "React Fundamentals",
        description:
          "Build a multi-page React SPA with at least 5 components, client-side routing, and state managed with hooks. No external state library required.",
        rewardAmount: 100,
      },
      {
        title: "REST API with Node & Express",
        description:
          "Create a REST API with at least 4 resource endpoints (CRUD). Include input validation, error handling middleware, and an OpenAPI or Postman collection.",
        rewardAmount: 150,
      },
      {
        title: "Database Design & Integration",
        description:
          "Design a normalised PostgreSQL schema, implement migrations, and wire up your API endpoints to the database using an ORM or query builder.",
        rewardAmount: 200,
      },
      {
        title: "Authentication & Authorisation",
        description:
          "Implement JWT-based auth: register, login, and at least one protected route. Passwords must be hashed (bcrypt). Include refresh-token logic.",
        rewardAmount: 250,
      },
      {
        title: "Testing Suite",
        description:
          "Achieve ≥ 70% test coverage on your API with integration tests. Include at least one happy path and one error path per endpoint. Use Jest or Vitest.",
        rewardAmount: 200,
      },
      {
        title: "Deploy to Production with CI/CD",
        description:
          "Deploy frontend and backend to separate hosting services. Set up a GitHub Actions pipeline that runs tests and deploys on push to main.",
        rewardAmount: 300,
      },
    ],
  },
}

const DEVOPS_BOOTCAMP: QuestTemplate = {
  id: "bootcamp-devops",
  category: "bootcamp",
  name: "DevOps Bootcamp",
  tagline: "Docker, Kubernetes, CI/CD, and cloud infrastructure in 8 weeks.",
  icon: "⚙️",
  duration: "7–9 weeks",
  step1: {
    name: "DevOps Engineering Bootcamp",
    description:
      "Master modern DevOps practices: containerisation with Docker, orchestration with Kubernetes, infrastructure as code, CI/CD pipelines, monitoring, and cloud deployment on AWS or GCP.",
    category: "DevOps",
    tags: ["docker", "kubernetes", "cicd", "cloud"],
  },
  step2: {
    milestones: [
      {
        title: "Containerise an Application",
        description:
          "Write a production-quality Dockerfile for an existing app. Use multi-stage builds, non-root user, and a .dockerignore. The image must build and run correctly.",
        rewardAmount: 100,
      },
      {
        title: "Docker Compose Multi-Service Setup",
        description:
          "Define a docker-compose.yml that runs at least three services (app, database, cache). Include named volumes, health checks, and an env-file.",
        rewardAmount: 150,
      },
      {
        title: "Kubernetes Deployment",
        description:
          "Write Kubernetes manifests (Deployment, Service, ConfigMap, Secret) for your app. Deploy to a local cluster (minikube or kind) and demonstrate rolling updates.",
        rewardAmount: 250,
      },
      {
        title: "CI/CD Pipeline",
        description:
          "Build a GitHub Actions workflow with lint, test, build, and deploy stages. The pipeline must fail fast and push a Docker image to a registry on success.",
        rewardAmount: 200,
      },
      {
        title: "Infrastructure as Code",
        description:
          "Provision a cloud environment using Terraform or Pulumi: VPC, compute instance, and managed database. All resources defined as code, no manual console steps.",
        rewardAmount: 300,
      },
      {
        title: "Observability Setup",
        description:
          "Instrument your app with structured logging and metrics. Set up Prometheus + Grafana (or cloud-native equivalents) with at least two alerting rules.",
        rewardAmount: 250,
      },
    ],
  },
}

// ─── Skill Challenges ────────────────────────────────────────────────────────

const RUST_SKILL_CHALLENGE: QuestTemplate = {
  id: "challenge-rust",
  category: "challenge",
  name: "Rust 30-Day Challenge",
  tagline: "Level up Rust skills with focused, verifiable code exercises.",
  icon: "🦀",
  duration: "4 weeks",
  step1: {
    name: "Rust 30-Day Skill Challenge",
    description:
      "A focused Rust skill challenge. Complete a series of progressively harder exercises covering ownership, traits, generics, async, and systems programming. Each milestone requires a working, idiomatic Rust implementation.",
    category: "Programming",
    tags: ["rust", "systems", "challenge", "intermediate"],
  },
  step2: {
    milestones: [
      {
        title: "Ownership & Borrowing Exercises",
        description:
          "Solve 10 exercises demonstrating ownership rules, borrowing, and lifetimes. All exercises must compile without warnings and pass the provided test suite.",
        rewardAmount: 75,
      },
      {
        title: "Implement a CLI Tool",
        description:
          "Build a CLI application using clap or argh. The tool should read from stdin or a file, process data, and output results. Include error handling with anyhow or thiserror.",
        rewardAmount: 125,
      },
      {
        title: "Generics, Traits & Iterators",
        description:
          "Implement a generic data structure (stack, queue, or sorted set) using traits. Write iterator implementations and demonstrate use in at least one practical example.",
        rewardAmount: 150,
      },
      {
        title: "Async Rust with Tokio",
        description:
          "Build an async HTTP client that fetches data from a public API, retries on failure (with exponential back-off), and writes results to a file. Use tokio and reqwest.",
        rewardAmount: 200,
      },
    ],
  },
}

const ALGO_CHALLENGE: QuestTemplate = {
  id: "challenge-algorithms",
  category: "challenge",
  name: "Algorithms & DSA Sprint",
  tagline: "Master 40 must-know patterns across arrays, trees, and graphs.",
  icon: "🧠",
  duration: "3–4 weeks",
  step1: {
    name: "Algorithms & Data Structures Sprint",
    description:
      "A targeted challenge covering the most important DSA patterns for technical interviews and competitive programming. Solve problems in your language of choice, document your reasoning, and hit complexity targets.",
    category: "Computer Science",
    tags: ["algorithms", "dsa", "interviews", "challenge"],
  },
  step2: {
    milestones: [
      {
        title: "Arrays, Strings & Sliding Window",
        description:
          "Solve 10 problems using two-pointer and sliding-window techniques. For each problem, state the time and space complexity and explain why your approach is optimal.",
        rewardAmount: 75,
      },
      {
        title: "Linked Lists & Stacks",
        description:
          "Implement singly and doubly linked lists from scratch. Solve 8 classic problems (reverse, detect cycle, merge sorted lists, LRU cache). All implementations must pass unit tests.",
        rewardAmount: 100,
      },
      {
        title: "Trees & Binary Search",
        description:
          "Solve 10 tree problems covering DFS, BFS, BST properties, lowest common ancestor, and serialisation/deserialisation. At least 3 problems must use iterative solutions.",
        rewardAmount: 150,
      },
      {
        title: "Graphs & Dynamic Programming",
        description:
          "Implement BFS and DFS for directed and undirected graphs. Solve 12 problems covering shortest paths, topological sort, DP tabulation, and DP memoisation.",
        rewardAmount: 200,
      },
    ],
  },
}

const OPEN_SOURCE_CHALLENGE: QuestTemplate = {
  id: "challenge-open-source",
  category: "challenge",
  name: "Open Source Contributor Sprint",
  tagline: "Make meaningful contributions to 3 real open-source projects.",
  icon: "🔓",
  duration: "4–6 weeks",
  step1: {
    name: "Open Source Contributor Sprint",
    description:
      "Stop lurking and start shipping. This challenge pushes you to make genuine, merged contributions to active open-source projects — bug fixes, features, docs, and tests all count.",
    category: "Open Source",
    tags: ["open-source", "github", "contribution", "community"],
  },
  step2: {
    milestones: [
      {
        title: "First Merged Pull Request",
        description:
          "Get your first PR merged into any active open-source project with ≥ 100 stars. The change must be non-trivial (not just a typo fix). Share the PR link.",
        rewardAmount: 100,
      },
      {
        title: "Bug Fix with Regression Test",
        description:
          "Find and fix a confirmed bug in an open-source project. Your PR must include a regression test that would have caught the bug. Link to the issue and merged PR.",
        rewardAmount: 150,
      },
      {
        title: "Feature Addition",
        description:
          "Implement a requested feature from an open-source project's issue tracker. The feature must be accepted and merged by the maintainers.",
        rewardAmount: 250,
      },
      {
        title: "Documentation Overhaul",
        description:
          "Significantly improve documentation for a library or tool: add a getting-started guide, API reference, or migration guide. Must be merged and publicly accessible.",
        rewardAmount: 100,
      },
      {
        title: "Maintainer Recognition",
        description:
          "Be recognised as a contributor (added to CONTRIBUTORS file, mentioned in release notes, or invited to the organisation) by at least one open-source project maintainer.",
        rewardAmount: 200,
      },
    ],
  },
}

// ─── Registry ────────────────────────────────────────────────────────────────

/** All templates in display order. */
export const QUEST_TEMPLATES: QuestTemplate[] = [
  // Courses
  WEB_DEV_FUNDAMENTALS,
  UI_UX_DESIGN_COURSE,
  DATA_SCIENCE_INTRO,
  // Bootcamps
  STELLAR_DEV_BOOTCAMP,
  FULLSTACK_JS_BOOTCAMP,
  DEVOPS_BOOTCAMP,
  // Challenges
  RUST_SKILL_CHALLENGE,
  ALGO_CHALLENGE,
  OPEN_SOURCE_CHALLENGE,
]

/** Templates grouped by category for tabbed browsing. */
export const TEMPLATES_BY_CATEGORY: Record<TemplateCategory, QuestTemplate[]> = {
  course: QUEST_TEMPLATES.filter(t => t.category === "course"),
  bootcamp: QUEST_TEMPLATES.filter(t => t.category === "bootcamp"),
  challenge: QUEST_TEMPLATES.filter(t => t.category === "challenge"),
}

/** Human-readable labels and metadata for each category tab. */
export const CATEGORY_META: Record<
  TemplateCategory,
  { label: string; description: string; icon: string }
> = {
  course: {
    label: "Courses",
    icon: "📚",
    description: "Self-paced learning paths with progressive milestones.",
  },
  bootcamp: {
    label: "Bootcamps",
    icon: "🏕️",
    description: "Intensive, structured programs with high-stakes rewards.",
  },
  challenge: {
    label: "Challenges",
    icon: "⚡",
    description: "Focused skill sprints to prove mastery fast.",
  },
}

/** Lookup a template by its unique id. Returns undefined if not found. */
export function getTemplateById(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find(t => t.id === id)
}
