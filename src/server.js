import express from 'express';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { searchWiki, getPage, getLinkGraph, listPages } from './mcp-tools.js';
import { runIndexer } from './indexer.js';
import db from './db.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

/**
 * Configure MCP Server Instance
 */
function createMcpServer() {
  const server = new Server(
    {
      name: 'llm-portfolio-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register available MCP Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search_wiki',
          description: 'Full-text and semantic keyword search across Utkarsh Sharma\'s personal portfolio wiki pages (projects, skills, experience, education).',
          inputSchema: {
            type: 'object',
            properties: {
              query_text: {
                type: 'string',
                description: 'Search query or keywords to locate relevant wiki pages (e.g. "RAG", "Python", "Tesseract", "Render", "PostgreSQL")',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of search results to return (default: 10)',
              },
            },
            required: ['query_text'],
          },
        },
        {
          name: 'get_page',
          description: 'Fetch complete markdown content, summary, tags, and incoming/outgoing wikilinks for a specific wiki page by title or slug.',
          inputSchema: {
            type: 'object',
            properties: {
              slug_or_title: {
                type: 'string',
                description: 'Slug or title of the page to retrieve (e.g. "rag-book-assistant", "ai-ml", "utkarsh-sharma")',
              },
            },
            required: ['slug_or_title'],
          },
        },
        {
          name: 'get_link_graph',
          description: 'Query bidirectional link graph relationships (backlinks and outgoing connections) for a specific page or fetch full wiki topology.',
          inputSchema: {
            type: 'object',
            properties: {
              slug: {
                type: 'string',
                description: 'Optional page slug to inspect incoming and outgoing link edges. Omit to retrieve full graph statistics.',
              },
            },
          },
        },
        {
          name: 'list_pages',
          description: 'List all indexed pages in the portfolio wiki, optionally filtered by skill tag or category.',
          inputSchema: {
            type: 'object',
            properties: {
              tag: {
                type: 'string',
                description: 'Optional tag to filter pages by (e.g., "python", "ai-ml", "data-science")',
              },
            },
          },
        },
      ],
    };
  });

  // Handle Tool Executions
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;
      switch (name) {
        case 'search_wiki':
          result = await searchWiki(args);
          break;
        case 'get_page':
          result = await getPage(args);
          break;
        case 'get_link_graph':
          result = await getLinkGraph(args);
          break;
        case 'list_pages':
          result = await listPages(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error executing tool '${name}': ${error.message}`,
          },
        ],
      };
    }
  });

  return server;
}

/**
 * Start Express HTTP / SSE Transport Server (Production & Render Mode)
 */
async function startHttpServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint for Render monitoring
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'llm-portfolio-mcp-server',
      database: Boolean(db.pool) ? 'connected' : 'fallback-mode',
      timestamp: new Date().toISOString(),
    });
  });

  // Re-indexing trigger endpoint
  app.post('/api/index', async (req, res) => {
    try {
      await runIndexer();
      res.json({ success: true, message: 'Wiki re-indexing complete.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const mcpServer = createMcpServer();
  let sseTransport = null;

  // SSE endpoint for Claude Custom Connector & MCP Clients
  app.get('/sse', async (req, res) => {
    console.log('🔗 Client connected via SSE transport');
    sseTransport = new SSEServerTransport('/messages', res);
    await mcpServer.connect(sseTransport);
  });

  // Messages endpoint for client-to-server requests
  app.post('/messages', async (req, res) => {
    if (sseTransport) {
      await sseTransport.handlePostMessage(req, res);
    } else {
      res.status(400).json({ error: 'No active SSE connection established.' });
    }
  });

  app.listen(PORT, () => {
    console.log(`🚀 Portfolio MCP Server listening on port ${PORT}`);
    console.log(`📡 SSE Endpoint: http://localhost:${PORT}/sse`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  });
}

/**
 * Start Stdio Transport Server (CLI Mode)
 */
async function startStdioServer() {
  const mcpServer = createMcpServer();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

// Determine transport mode from arguments or environment
if (process.argv.includes('--stdio')) {
  startStdioServer();
} else {
  startHttpServer();
}
