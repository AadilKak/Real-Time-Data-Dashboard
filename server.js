import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import Redis from 'ioredis';
import os from 'os'; 

// --- Configuration ---
const PORT = 8080;
// *** CHANGE FOR DOCKER: Use the service name 'redis' instead of localhost ***
const REDIS_HOST = 'redis'; 
const REDIS_PORT = 6379;
const REDIS_CHANNEL = 'crypto-updates'; // Must match crypto_ticker.py

// --- Server Setup ---
const app = express();
const server = createServer(app);

// 1. Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// 2. Initialize Redis Subscriber Client
const subscriber = new Redis({
    port: REDIS_PORT,
    host: REDIS_HOST,
});

// Store connected clients for broadcasting
const clients = new Set(); 

// --- WebSocket Logic ---
wss.on('connection', function connection(ws) {
    clients.add(ws);
    console.log('Client connected. Total clients:', clients.size);

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected. Total clients:', clients.size);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// --- Redis Pub/Sub Logic ---
subscriber.subscribe(REDIS_CHANNEL, (err, count) => {
    if (err) {
        console.error("Failed to subscribe to Redis channel:", err);
    } else {
        console.log(`Successfully subscribed to ${count} channel(s). Listening for crypto updates...`);
    }
});

subscriber.on('message', (channel, message) => {
    if (channel === REDIS_CHANNEL) {
        console.log(`[REDIS CONSUMED] Broadcasting ${REDIS_CHANNEL} update to ${clients.size} clients.`);

        clients.forEach(client => {
            if (client.readyState === 1) { // 1 means OPEN
                client.send(message);
            }
        });
    }
});

// --- Error Handling & Startup ---
server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  Real-Time WebSocket Server Running on port ${PORT}`);
    console.log(`  Frontend connection URL: ws://localhost:${PORT}`);
    console.log(`======================================================\n`);
    
    // Check Redis connection status
    subscriber.on('error', (err) => console.error('Redis Error:', err));
});