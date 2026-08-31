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

import { searchWiki, getPage, getLinkGraph, listPages, getAllowedTiers } from './mcp-tools.js';
import { runIndexer } from './indexer.js';
import db from './db.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const SERVER_NAME = process.env.SERVER_NAME || 'llm-portfolio-mcp-server';

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
          description: 'Full-text search across Travel Wiki pages and destinations (Asia, India, Dubai, Tokyo, Singapore, Manali, etc.).',
          inputSchema: {
            type: 'object',
            properties: {
              query_text: {
                type: 'string',
                description: 'Search query or keywords to locate relevant travel pages (e.g. "Dubai", "Japan", "Singapore", "Manali", "Metro")',
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
          description: 'Fetch complete markdown travel guide content, summary, tags, and incoming/outgoing wikilinks for a destination page by title or slug.',
          inputSchema: {
            type: 'object',
            properties: {
              slug_or_title: {
                type: 'string',
                description: 'Slug or title of the page to retrieve (e.g. "asia", "dubai", "japan", "singapore", "delhi")',
              },
            },
            required: ['slug_or_title'],
          },
        },
        {
          name: 'get_link_graph',
          description: 'Query bidirectional link graph relationships (backlinks and outgoing destination connections) for a specific travel page or fetch full graph topology.',
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
          description: 'List all indexed travel pages, optionally filtered by tag or category.',
          inputSchema: {
            type: 'object',
            properties: {
              tag: {
                type: 'string',
                description: 'Optional tag to filter pages by (e.g., "asia", "india", "clippings")',
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

  // Enable permissive CORS for cross-origin requests from Claude / web clients
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mcp-session-id', 'Accept', 'Origin', '*'],
    credentials: true,
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

  // Helper handler for SSE connections
  const handleSseConnection = async (req, res) => {
    console.log(`🔗 New SSE connection request from ${req.ip} on ${req.path}`);
    const mcpServer = createMcpServer();
    const transport = new SSEServerTransport('/messages', res);
    
    transports.set(transport.sessionId, transport);

    transport.onclose = () => {
      console.log(`🔌 SSE Transport closed: ${transport.sessionId}`);
      transports.delete(transport.sessionId);
    };

    await mcpServer.connect(transport);
  };

  // Root endpoint: Handles SSE if requested by client, otherwise returns 200 OK JSON status
  app.get('/', async (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      return handleSseConnection(req, res);
    }
    res.status(200).json({
      service: SERVER_NAME,
      status: 'active',
      mcp_version: '1.0',
      allowed_tiers: getAllowedTiers(),
      authentication: { required: false, type: 'none' },
      mcp_sse_endpoint: '/sse',
      health_check: '/health'
    });
  });

  // Dedicated SSE endpoint
  app.all('/sse', (req, res, next) => {
    if (req.method === 'GET') {
      return handleSseConnection(req, res);
    }
    if (req.method === 'OPTIONS' || req.method === 'HEAD') {
      return res.status(200).end();
    }
    next();
  });

  // RFC 9728 Protected Resource Metadata endpoint
  app.all([
    '/.well-known/oauth-protected-resource',
    '/.well-known/oauth-protected-resource/*',
    '*/.well-known/oauth-protected-resource',
  ], (req, res) => {
    const baseUrl = getBaseUrl(req);
    res.status(200).json({
      resource: baseUrl,
      authorization_servers: [baseUrl],
      authentication_required: false,
      scopes_supported: [],
      bearer_methods_supported: ['header'],
      resource_documentation: baseUrl
    });
  });

  // RFC 8414 & MCP Discovery Endpoints
  app.all([
    '/.well-known/oauth-authorization-server',
    '/.well-known/oauth-authorization-server/*',
    '/.well-known/mcp-configuration',
    '/.well-known/mcp.json',
    '/.well-known/openid-configuration',
    '*/.well-known/*'
  ], (req, res) => {
    const baseUrl = getBaseUrl(req);
    res.status(200).json({
      mcp_version: '1.0',
      authentication_required: false,
      authentication: { type: 'none' },
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      allowed_tiers: getAllowedTiers(),
      sse_endpoint: `${baseUrl}/sse`,
      messages_endpoint: `${baseUrl}/messages`
    });
  });

  // Dynamic Client Registration (RFC 7591) fallback
  app.all(['/oauth/register', '/register'], (req, res) => {
    res.status(200).json({
      client_id: 'llm_portfolio_mcp_client',
      client_secret: 'llm_portfolio_mcp_secret',
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0
    });
  });

  // OAuth Authorization endpoint fallback (Instant redirect)
  app.all(['/oauth/authorize', '/authorize'], (req, res) => {
    const { redirect_uri, state } = req.query;
    if (redirect_uri) {
      const targetUrl = new URL(String(redirect_uri));
      targetUrl.searchParams.set('code', 'mcp_auth_code_success');
      if (state) targetUrl.searchParams.set('state', String(state));
      return res.redirect(targetUrl.toString());
    }
    res.status(200).send('Authorization granted for LLM Travel MCP Server.');
  });

  // OAuth Token Endpoint fallback
  app.all(['/oauth/token', '/token'], (req, res) => {
    res.status(200).json({
      access_token: 'mcp_access_token_valid',
      token_type: 'Bearer',
      expires_in: 86400
    });
  });

  // Health check endpoint for Render monitoring
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: SERVER_NAME,
      allowed_tiers: getAllowedTiers(),
      database: Boolean(db.pool) ? 'connected' : 'fallback-mode',
      timestamp: new Date().toISOString(),
    });
  });

  // Re-indexing trigger endpoint
  app.post('/api/index', async (req, res) => {
    try {
      await runIndexer();
      res.status(200).json({ success: true, message: 'Wiki re-indexing complete.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Messages endpoint for client-to-server JSON-RPC requests
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    let transport = transports.get(sessionId);

    // Fallback to most recent active transport if single-session client
    if (!transport && transports.size > 0) {
      transport = Array.from(transports.values()).pop();
    }

    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
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
