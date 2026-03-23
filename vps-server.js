const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('dist'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start HTTP server
const httpServer = app.listen(HTTP_PORT, () => {
  console.log(`🌐 HTTP server running on port ${HTTP_PORT}`);
});

// Start WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

// Store active connections
const connections = new Set();

wss.on('connection', (ws, req) => {
  console.log('📡 WebSocket client connected');
  connections.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to NFT Auction WebSocket'
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received:', data);
      
      // Broadcast to all other clients
      connections.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
    connections.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    connections.delete(ws);
  });
});

console.log(`🔌 WebSocket server running on port ${WS_PORT}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down servers...');
  httpServer.close();
  wss.close();
  process.exit(0);
});
