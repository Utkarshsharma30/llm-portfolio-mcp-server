# Markdown Personal Portfolio Wiki & Knowledge Graph MCP Server

An end-to-end Markdown-based personal wiki with pages, tags, and a bidirectional knowledge graph built following the **Karpathy pattern**:
`Raw Sources → Structured Wiki → Knowledge Graph (PostgreSQL) → Query Flow (MCP Tools / Claude Connector)`

Exposes `search_wiki`, `get_page`, `get_link_graph`, and `list_pages` MCP tools for AI agents and connected LLMs.

---

## 🌟 Key Features

1. **Karpathy Ingestion Pattern**:
   - `raw/`: Unstructured source document clippings (`Utkarsh Sharma.md`).
   - `wiki/`: Structured, cross-referenced Markdown concept and project pages.
   - `PostgreSQL / JSON Index`: Automated relational full-text search (`tsvector`) and bidirectional graph edge table.
   - `MCP Tools`: Live query flow for LLMs and custom connectors.

2. **Model Context Protocol (MCP) Tools**:
   - `search_wiki`: Full-text rank-scored search across titles, summaries, content, and tags.
   - `get_page`: Retrieve full markdown content, summary, metadata, outgoing links, and incoming backlinks.
   - `get_link_graph`: Query incoming/outgoing link connections or full knowledge graph topology.
   - `list_pages`: List all indexed pages filtered by tag or category.

3. **Public Cloud Deployment & Live Claude Connector**:
   - Production Express server with Server-Sent Events (`/sse`) transport.
   - Ready for one-click public deployment on Render (`render.yaml`).
   - Connects to Claude as a live Custom MCP Connector.

---

## 📁 Repository Structure

```
llm-portfolio/
├── raw/                      # Raw source files
│   └── Utkarsh Sharma.md
├── wiki/                     # Structured Markdown wiki pages
│   ├── index.md              # Master Table of Contents
│   ├── utkarsh-sharma.md     # Profile summary page
│   ├── projects.md           # Projects list overview
│   ├── markdown-personal-wiki-mcp.md # Dedicated project page
│   ├── rag-book-assistant.md
│   ├── ai-ml.md
│   ├── python.md
│   └── log.md                # Operation log
├── db/
│   └── schema.sql            # PostgreSQL schema with tsvector & graph tables
├── src/
│   ├── db.js                 # PostgreSQL connection pool & schema bootstrapper
│   ├── parser.js             # Markdown, tag, & [[wikilink]] graph parser
│   ├── indexer.js            # Graph indexer & tsvector generator
│   ├── mcp-tools.js          # MCP tool implementations (search, lookup, graph)
│   └── server.js             # Express HTTP/SSE & Stdio MCP server
├── Dockerfile                # Docker container configuration
├── render.yaml               # Render Infrastructure-as-Code blueprint
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

```bash
cp .env.example .env
```

Set your PostgreSQL connection string (or use JSON fallback mode if running without Postgres):

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/portfolio_wiki
```

### 3. Run Knowledge Graph Indexer

Scan the `wiki/` directory, parse wikilinks (`[[page-slug]]`), extract tags, and build PostgreSQL tables (or JSON index):

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

## ☁️ Deployment on Render

This repository includes a pre-configured `render.yaml` blueprint.

1. Connect your GitHub repository to [Render](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Select this repository. Render will automatically provision:
   - A free **PostgreSQL Database** (`portfolio-wiki-db`)
   - A Node.js **Web Service** (`llm-portfolio-mcp-server`)
4. Upon deployment, Render automatically builds the project and runs `npm run index` to index the wiki.

---

## 🤖 Connecting to Claude (Live Custom Connector)

Once deployed on Render (e.g. `https://llm-portfolio-mcp-server.onrender.com`), connect it to Claude as a Custom MCP Connector:

1. Open Claude Custom Connectors settings.
2. Add a new MCP Server with:
   - **Name**: `Portfolio Knowledge Graph`
   - **Transport**: `SSE`
   - **URL**: `https://llm-portfolio-mcp-server.onrender.com/sse`
3. Save connection. Claude will automatically discover the exposed tools (`search_wiki`, `get_page`, `get_link_graph`, `list_pages`).
