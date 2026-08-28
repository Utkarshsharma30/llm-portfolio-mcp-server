# Markdown Personal Portfolio Wiki & Knowledge Graph MCP Server

An end-to-end Markdown-based personal wiki with pages, tags, and a bidirectional knowledge graph built following the **Karpathy pattern**:
`Raw Sources → Structured Wiki → Knowledge Graph (PostgreSQL) → Query Flow (MCP Tools / Claude Connector)`

Features **Tier-Based Access Control** (Tiers 1, 2, 3) across 3 remote MCP servers on Render.

---

## 🔒 Tier-Based Access Control Architecture

The wiki knowledge base is categorized into 3 security tiers:

| Tier Level | Access Boundary Scope | Description & Contents | Example Pages |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Public Portfolio** | High-level profile, core skills, public projects overview, education | `index.md`, `utkarsh-sharma.md`, `projects.md`, `education.md`, `ai-ml.md`, `python.md` |
| **Tier 2** | **Internal & Operational** | Detailed project specs, internship logs, architecture walkthroughs | `experience.md`, `log.md`, `pdf-invoice-data-extraction-automation.md`, `rag-book-assistant.md`, `markdown-personal-wiki-mcp.md` |
| **Tier 3** | **Confidential & Raw** | Raw source clippings, internal contact details, raw notes | `raw/Utkarsh Sharma.md`, confidential notes |

---

## 🌐 Remote Render MCP Server Instances

| Server | Render Service URL | Environment Variable | Permitted Data Scope |
| :--- | :--- | :--- | :--- |
| **MCP Server 1** | `https://llm-portfolio-mcp1.onrender.com/sse` | `ALLOWED_TIERS=1,2,3` | **All Tiers** (Tier 1 + Tier 2 + Tier 3) |
| **MCP Server 2** | `https://llm-portfolio-mcp2.onrender.com/sse` | `ALLOWED_TIERS=2,3` | **Tier 2 & Tier 3** Data |
| **MCP Server 3** | `https://llm-portfolio-mcp3.onrender.com/sse` | `ALLOWED_TIERS=3` | **Tier 3 Only** Data |

---

## 🌟 Key Features

1. **Karpathy Ingestion Pattern**:
   - `raw/`: Unstructured source document clippings (`Utkarsh Sharma.md` + dedicated project files).
   - `wiki/`: Structured, cross-referenced Markdown concept and project pages.
   - `PostgreSQL / JSON Index`: Automated relational full-text search (`tsvector`) and bidirectional graph edge table.
   - `MCP Tools`: Live query flow for LLMs and custom connectors.

2. **Model Context Protocol (MCP) Tools**:
   - `search_wiki`: Full-text rank-scored search filtered by server tier permissions.
   - `get_page`: Retrieve full markdown content, summary, metadata, outgoing links, and incoming backlinks for permitted tier pages.
   - `get_link_graph`: Query incoming/outgoing link connections or full knowledge graph topology restricted to permitted tiers.
   - `list_pages`: List all indexed pages filtered by tag and server tier level.

3. **Public Cloud Deployment & Live Claude Connector**:
   - Production Express server with Server-Sent Events (`/sse`) transport.
   - One-click multi-service deployment on Render (`render.yaml`).
   - Seamless live integration with Claude as Custom MCP Connectors.

---

## 📁 Repository Structure

```
llm-portfolio/
├── raw/                      # Raw source files (Tier 3)
│   └── Utkarsh Sharma.md
├── wiki/                     # Structured Markdown wiki pages (Tiers 1 & 2)
│   ├── index.md              # Master Table of Contents (Tier 1)
│   ├── utkarsh-sharma.md     # Profile summary page (Tier 1)
│   ├── projects.md           # Projects list overview (Tier 1)
│   ├── markdown-personal-wiki-mcp.md # Detailed project page (Tier 2)
│   ├── rag-book-assistant.md (Tier 2)
│   ├── ai-ml.md (Tier 1)
│   ├── python.md (Tier 1)
│   └── log.md                # Operation log (Tier 2)
├── db/
│   └── schema.sql            # PostgreSQL schema with tsvector, tier column, & graph tables
├── src/
│   ├── db.js                 # PostgreSQL connection pool & schema bootstrapper
│   ├── parser.js             # Markdown, tag, tier & [[wikilink]] parser
│   ├── indexer.js            # Graph indexer & tsvector generator
│   ├── mcp-tools.js          # Tier-filtered MCP tools (search, lookup, graph)
│   └── server.js             # Express HTTP/SSE & Stdio MCP server
├── Dockerfile                # Docker container configuration
├── render.yaml               # Render Infrastructure blueprint (MCP 1, MCP 2, MCP 3)
├── package.json              # Dependencies and scripts
└── .env.example              # Environment variables template
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file from `.env.example`:

```env
PORT=3000
ALLOWED_TIERS=1,2,3
DATABASE_URL=postgres://postgres:postgres@localhost:5432/portfolio_wiki
```

### 3. Run Knowledge Graph Indexer

Scan the `wiki/` and `raw/` directories, parse wikilinks (`[[page-slug]]`), extract tags and tier metadata, and build PostgreSQL tables (or JSON index):

```bash
npm run index
```

### 4. Start MCP Server

Start the server in HTTP/SSE mode:

```bash
npm start
```

For CLI/Stdio mode:

```bash
node src/server.js --stdio
```

---

## ☁️ Multi-Server Deployment on Render

This repository includes a pre-configured `render.yaml` blueprint provisioning 3 tier-restricted MCP servers:

1. Connect your GitHub repository to [Render](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Select this repository. Render will automatically provision:
   - Shared **PostgreSQL Database** (`portfolio-wiki-db`)
   - **MCP Server 1** (`llm-portfolio-mcp1` - `ALLOWED_TIERS=1,2,3`)
   - **MCP Server 2** (`llm-portfolio-mcp2` - `ALLOWED_TIERS=2,3`)
   - **MCP Server 3** (`llm-portfolio-mcp3` - `ALLOWED_TIERS=3`)

---

## 🤖 Connecting to Claude (Live Custom Connectors)

Connect any of the 3 remote MCP servers to Claude as Custom MCP Connectors:

- **Full Access Connector (MCP 1)**: `https://llm-portfolio-mcp1.onrender.com/sse`
- **Internal Access Connector (MCP 2)**: `https://llm-portfolio-mcp2.onrender.com/sse`
- **Confidential Access Connector (MCP 3)**: `https://llm-portfolio-mcp3.onrender.com/sse`
