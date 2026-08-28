# Markdown Travel Wiki & Knowledge Graph MCP Server

An end-to-end Markdown-based travel knowledge wiki with pages, tags, and a bidirectional knowledge graph built following the **Karpathy pattern**:
`Raw Sources (Wikivoyage / Travel Clippings) → Structured Wiki → Knowledge Graph (PostgreSQL) → Query Flow (MCP Tools / Claude Connector)`

Features **Progressive Tier-Based Access Control** (Tiers 1, 2, 3) across 3 remote MCP servers on Render.

---

## 🔒 Travel Data Tier Boundaries

| Tier Level | Access Scope | Description & Contents | Example Pages |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Regional Overview & Index** | Regional breakdown, country overview, table of contents, quick start guide | `India.md`, `South Asia.md`, `README.md`, `Quick Start.md` |
| **Tier 2** | **Tier 1 + Detailed Destination Guides** | Full travel guides, top attractions, metro transit, hotel recommendations | `Delhi.md` (Top 25 attractions), `Manali.md` (Hill station & adventure) |
| **Tier 3** | **Tier 1 + Tier 2 + Raw Sources & Clippings** | Full raw Wikivoyage travel guides, Mark Wiens clippings, community guides | `raw/25 Incredible Things To Do In Delhi...`, `raw/Travellers' guide to India...` |

---

## 🌐 Remote Render MCP Server Instances

| Server | Render Service URL | Environment Variable | Permitted Data Scope |
| :--- | :--- | :--- | :--- |
| **MCP Server 1** | `https://llm-portfolio-mcp1.onrender.com/sse` | `ALLOWED_TIERS=1` | **Travel Overview & Regions Only** (Tier 1) |
| **MCP Server 2** | `https://llm-portfolio-mcp2.onrender.com/sse` | `ALLOWED_TIERS=1,2` | **Overview + Detailed Destination Guides** (Delhi & Manali) |
| **MCP Server 3** | `https://llm-portfolio-mcp3.onrender.com/sse` | `ALLOWED_TIERS=1,2,3` | **Full Travel Access** (Overview + Guides + Raw Wikivoyage Sources) |

---

## 🌟 Key Features

1. **Karpathy Ingestion Pattern**:
   - `raw/`: Unstructured travel source document clippings (`25 Incredible Things To Do In Delhi`, `Travellers' guide to India`, `Wikivoyage`).
   - `wiki/`: Structured, cross-referenced Markdown travel pages (`India`, `South Asia`, `Delhi`, `Manali`).
   - `PostgreSQL / JSON Index`: Automated relational full-text search (`tsvector`) and bidirectional graph edge table.
   - `MCP Tools`: Live query flow for LLMs and custom connectors (`search_wiki`, `get_page`, `get_link_graph`, `list_pages`).

2. **Model Context Protocol (MCP) Tools**:
   - `search_wiki`: Full-text rank-scored search filtered by server tier permissions.
   - `get_page`: Retrieve full markdown content, summary, metadata, outgoing links, and incoming backlinks for permitted travel pages.
   - `get_link_graph`: Query incoming/outgoing travel link connections or full destination graph topology restricted to permitted tiers.
   - `list_pages`: List all indexed travel pages filtered by tag and server tier level.

3. **Public Cloud Deployment & Live Claude Connectors**:
   - Production Express server with Server-Sent Events (`/sse`) transport.
   - One-click multi-service deployment on Render (`render.yaml`).
   - Seamless live integration with Claude as Custom MCP Connectors.

---

## 📁 Repository Structure

```
llm-portfolio/
├── raw/                      # Raw source travel documents (Tier 3)
│   ├── 25 Incredible Things To Do In Delhi, India.md
│   ├── An Indian’s Guide to Japan.md
│   ├── Asia – Travel guide at Wikivoyage.md
│   ├── South Asia – Travel guide at Wikivoyage.md
│   ├── Top Places To Visit In Manali.md
│   └── Travellers' guide to India.md
├── wiki/                     # Structured Markdown travel wiki pages (Tiers 1 & 2)
│   ├── India.md              # Regional breakdown & country guide (Tier 1)
│   ├── South Asia.md         # Subcontinent regional overview (Tier 1)
│   ├── Quick Start.md        # Getting started guide (Tier 1)
│   ├── README.md             # Master Table of Contents (Tier 1)
│   ├── Delhi.md              # Capital city travel guide & top 25 attractions (Tier 2)
│   └── Manali.md             # Hill station & adventure guide (Tier 2)
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

Create a `.env` file:

```env
PORT=3000
ALLOWED_TIERS=1,2,3
DATABASE_URL=postgres://postgres:postgres@localhost:5432/portfolio_wiki
```

### 3. Run Knowledge Graph Indexer

```bash
npm run index
```

### 4. Start MCP Server

```bash
npm start
```

---

## 🤖 Connecting to Claude (Live Custom Connectors)

- **Travel Overview Connector (MCP 1)**: `https://llm-portfolio-mcp1.onrender.com/sse`
- **Destination Guides Connector (MCP 2)**: `https://llm-portfolio-mcp2.onrender.com/sse`
- **Full Travel & Raw Sources Connector (MCP 3)**: `https://llm-portfolio-mcp3.onrender.com/sse`
