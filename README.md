# Markdown Travel Wiki & Knowledge Graph MCP Server

An end-to-end Markdown-based travel knowledge wiki with pages, tags, and a bidirectional knowledge graph built following the **Karpathy pattern**:
`Raw Sources (Wikivoyage / Travel Guides) → Structured Wiki → Knowledge Graph (PostgreSQL) → Query Flow (MCP Tools / Claude Connector)`

Features **Tier-Based Access Boundaries** across 3 remote MCP servers on Render.

---

## 🔒 Tier Access Boundaries & Server Mapping

The travel wiki knowledge base is categorized into 3 server access tiers:

| Server Instance | Environment Config | Access Boundary Scope | Included Content & Destinations |
| :--- | :--- | :--- | :--- |
| **MCP Server 1** | `ALLOWED_TIERS=1` | **Asia Countries (Excluding India)** | Asia Overview, Dubai, Japan, Singapore, Wikivoyage Asia raw guides |
| **MCP Server 2** | `ALLOWED_TIERS=1,2` | **MCP 1 + India & States (Excluding Delhi)** | India Overview, Goa, Kerala, Maharashtra, Manali, Mumbai, Agra, Top Indian Places |
| **MCP Server 3** | `ALLOWED_TIERS=1,2,3` | **MCP 1 + MCP 2 + Delhi (Full Access)** | Full Travel Wiki + Delhi (Top 20+ attractions, UNESCO sites, street food, transit) |

---

## 🌐 Remote Render MCP Server Endpoints

- **MCP Server 1 (Asia Countries Excl. India)**: `https://llm-portfolio-mcp1.onrender.com/sse`
- **MCP Server 2 (MCP 1 + India & States Excl. Delhi)**: `https://llm-portfolio-mcp2.onrender.com/sse`
- **MCP Server 3 (MCP 1 + MCP 2 + Delhi / Full Access)**: `https://llm-portfolio-mcp3.onrender.com/sse`

---

## 🌟 Key Features

1. **Clean Graph Edge Filtering**:
   - Filtered out unnecessary graph targets (`readme`, `licence`, `index`, `quick-start`, `changelog`) to maintain a clean, high-signal destination knowledge graph topology.

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
├── raw/                      # Raw travel source documents
│   ├── Asia – Travel guide at Wikivoyage.md
│   ├── Dubai.md
│   ├── Japan.md
│   ├── Singapore.md
│   ├── Agra.md
│   ├── Explore Manali.md
│   ├── Goa, India.md
│   ├── Kerala.md
│   ├── Places to Visit in India.md
│   └── Things to Do in Delhi.md
├── wiki/                     # Structured Markdown travel wiki pages
│   ├── Asia.md               # Asia continental guide (Tier 1)
│   ├── Dubai.md              # Dubai city guide (Tier 1)
│   ├── Japan.md              # Japan country guide (Tier 1)
│   ├── Singapore.md          # Singapore guide (Tier 1)
│   ├── India.md              # India travel guide (Tier 2)
│   ├── Goa.md                # Goa beach guide (Tier 2)
│   ├── Kerala.md             # Kerala backwaters guide (Tier 2)
│   ├── Maharashtra.md        # Maharashtra state guide (Tier 2)
│   ├── Manali.md             # Manali hill station guide (Tier 2)
│   ├── Mumbai.md             # Mumbai financial capital guide (Tier 2)
│   ├── Top Indian Places to Visit.md (Tier 2)
│   ├── Delhi.md              # Delhi capital guide (Tier 3)
│   └── index.md              # Travel Wiki Master Index
├── db/
│   └── schema.sql            # PostgreSQL schema with tsvector, tier column, & graph tables
├── src/
│   ├── db.js                 # PostgreSQL connection pool & schema bootstrapper
│   ├── parser.js             # Ignored link filter, tier parser & [[wikilink]] graph parser
│   ├── indexer.js            # Graph indexer & tsvector generator
│   ├── mcp-tools.js          # Tier-filtered MCP tools (search, lookup, graph)
│   └── server.js             # Express HTTP/SSE & Stdio MCP server
├── render.yaml               # Render Infrastructure blueprint (MCP 1, MCP 2, MCP 3)
└── package.json              # Dependencies and scripts
```
