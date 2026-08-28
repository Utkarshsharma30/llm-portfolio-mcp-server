import express from 'express';
import cors from 'cors';
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

  // Enable full CORS for cross-origin requests from Claude / web clients
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mcp-session-id', '*'],
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Store active SSE transports by sessionId
  const transports = new Map();

  const getBaseUrl = (req) => {
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    return `${proto}://${host}`;
  };

  // Root endpoint info & SSE redirect fallback
  app.get('/', (req, res) => {
    res.json({
      service: 'llm-portfolio-mcp-server',
      status: 'active',
      mcp_sse_endpoint: '/sse',
      health_check: '/health',
      auth: 'supported'
    });
  });

  // OAuth 2.0 Discovery Endpoints (RFC 8414 & RFC 9728) for seamless Claude Custom Connector registration
  app.get(['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration', '/.well-known/mcp-configuration'], (req, res) => {
    const baseUrl = getBaseUrl(req);
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      scopes_supported: ['mcp'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'client_credentials'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post']
    });
  });

  // Dynamic Client Registration (RFC 7591)
  app.post(['/oauth/register', '/register'], (req, res) => {
    res.status(201).json({
      client_id: 'llm_portfolio_mcp_client',
      client_secret: 'llm_portfolio_mcp_secret',
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0
    });
  });

  // OAuth Authorization Endpoint (Auto-approves and redirects back to Claude)
  app.get(['/oauth/authorize', '/authorize'], (req, res) => {
    const { redirect_uri, state } = req.query;
    if (redirect_uri) {
      const targetUrl = new URL(String(redirect_uri));
      targetUrl.searchParams.set('code', 'mcp_auth_code_success');
      if (state) targetUrl.searchParams.set('state', String(state));
      return res.redirect(targetUrl.toString());
    }
    res.send('Authorization granted for LLM Portfolio MCP Server.');
  });

  // OAuth Token Endpoint
  app.post(['/oauth/token', '/token'], (req, res) => {
    res.json({
      access_token: 'mcp_access_token_valid',
      token_type: 'Bearer',
      expires_in: 86400
    });
  });

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

  // SSE endpoint for Claude Custom Connector & MCP Clients
  app.get('/sse', async (req, res) => {
    console.log('🔗 New SSE client connection request');
    const mcpServer = createMcpServer();
    const transport = new SSEServerTransport('/messages', res);
    
    transports.set(transport.sessionId, transport);

    transport.onclose = () => {
      console.log(`🔌 SSE Transport closed: ${transport.sessionId}`);
      transports.delete(transport.sessionId);
    };

    await mcpServer.connect(transport);
  });

  // Messages endpoint for client-to-server requests
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    let transport = transports.get(sessionId);

    // Fallback to most recent active transport if single-session client
    if (!transport && transports.size > 0) {
      transport = Array.from(transports.values()).pop();
    }

    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).json({ error: `Session ${sessionId || 'unknown'} not found or expired.` });
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
