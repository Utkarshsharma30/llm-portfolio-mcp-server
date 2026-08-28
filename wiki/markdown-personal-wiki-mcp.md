---
tier: 1
---

# Markdown Personal Wiki & Knowledge Graph MCP Server

**Summary**: Markdown-based personal wiki with bidirectional knowledge graph, PostgreSQL indexing, and Node.js MCP server deployed on Render and connected to Claude as a live custom connector.

**Sources**:
- raw/Utkarsh Sharma.md

**Last updated**: 2026-08-28

---

## Overview

The Markdown Personal Wiki & Knowledge Graph MCP Server is an end-to-end knowledge management and tool retrieval system. Following the Karpathy pattern (raw sources → structured wiki → knowledge graph → query flow), it structures knowledge into markdown pages and bidirectional graph links, indexes them in PostgreSQL, and exposes the system to AI agents (such as Claude) via Model Context Protocol (MCP) APIs.

(source: Utkarsh Sharma.md)

## Technical Stack

- **Server Backend**: Node.js
- **Database**: PostgreSQL (relational & graph index)
- **Protocol**: Model Context Protocol (MCP)
- **Deployment**: Render (public deployment)
- **Integration**: Claude Custom Connector
- **Content Format**: Markdown (pages, tags, bidirectional links)

## Architecture & Workflow (Karpathy Pattern)

1. **Raw Sources**: Ingestion of raw notes, articles, and documents.
2. **Structured Wiki**: Formatting content into clean, interlinked Markdown pages with tags and metadata.
3. **Knowledge Graph**: Parsing and building bidirectional links (`[[page-name]]`) between concepts and entities.
4. **PostgreSQL Indexing**: Storing page content, metadata, and link relationship graphs for fast relational & vector query performance.
5. **MCP Server**: Node.js backend exposing standard MCP tools:
   - `search`: Full-text / semantic search over wiki pages.
   - `page lookup`: Fetch exact page content by title/slug.
   - `link-graph`: Traversal and analysis of incoming/outgoing knowledge links.
6. **Query Flow & LLM Integration**: Live public deployment on Render connected directly to Claude as a custom connector.

## Features

### Knowledge Representation
- Page, tag, and entity-level organization
- Bidirectional link parsing (`[[page-name]]`) and connection tracking
- Structured metadata frontmatter support

### MCP Tooling & API
- Standardized Model Context Protocol endpoints
- Search tool for rapid knowledge retrieval
- Page lookup tool for deep context fetching
- Link-graph tool for context expansion and graph traversal

### Deployment & Integration
- Public production server running on Render
- Seamless live connection to Claude interface

## Skills Demonstrated

- Model Context Protocol (MCP) development
- Node.js backend engineering
- PostgreSQL database schema design & indexing
- Knowledge graph construction & bidirectional linking
- System architecture design (Karpathy ingestion pattern)
- Cloud deployment & continuous delivery (Render)
- Custom connector integration with LLMs (Claude)

## Related pages

- [[Utkarsh Sharma]]
- [[Projects]]
- [[AI/ML]]
- [[Python]]
