# Real-Time Cryptocurrency Dashboard

This project demonstrates a scalable, three-tier microservices architecture designed to process and visualize real-time cryptocurrency market data, showcasing a production-ready data pipeline.

## Core Features & Impact

**Real-Time Data Pipeline:** Utilizes Python for data sourcing, Redis Pub/Sub for resilient messaging, and Node.js WebSockets for low-latency transmission.

**Architecture Decoupling:** The use of Redis ensures reliable message queuing and consumption, maintaining data freshness and UI responsiveness even during high-volume periods.

**Modern Frontend:** A lightweight React application built with Vite and Tailwind CSS for optimized rendering and visualization.

**Technologies:** Python, Redis, Node.js, WebSockets, React (Vite), and Docker Compose.

## Architectural Overview

The system is built on a robust, decoupled architecture:

**Data Source (Python):** The `crypto_ticker.py` container uses the `ccxt` library to poll the Binance exchange for price updates (BTC/USDT, ETH/USDT, etc.) every 0.5 seconds.

**Message Queue (Redis):** The Python script publishes these JSON updates to a Redis Pub/Sub channel. This acts as a reliable buffer, decoupling the data source from the transport layer.

**Transport Layer (Node.js):** The `ws-server.js` container subscribes to the Redis channel. When it receives an update, it immediately broadcasts the data to all connected browser clients via WebSockets on port `8080`.

**Presentation (React/Vite):** The React frontend establishes a persistent WebSocket connection to the Dockerized Node.js server and instantly updates the UI (including price flash animations) whenever new data arrives.

## Prerequisites

To run this project, you need:

- Node.js (LTS recommended)
- npm (Installed with Node.js)
- Docker (Docker Desktop or Docker Engine)

## Getting Started (Quick Run)

The entire backend stack is containerized and can be launched with a single command.

### 1. Start the Backend Services (Python, Redis, Node.js)

Open your terminal in the root directory (where `docker-compose.yml` is located) and run:
```
docker compose up --build
```

Wait for the logs to confirm all services are running:

- `crypto-redis` should show: Ready to accept connections.
- `crypto-ticker` should show: Published update: BTC/USDT Price: ...
- `crypto-ws-server` should show: Listening for crypto updates...

### 2. Start the Frontend Visualization (React)

Open a separate terminal window, navigate to the frontend folder, and start the development server:
```
cd frontend
npm install
npm run dev
```

The terminal will provide a URL (e.g., `http://localhost:5173`). Open this URL in your browser.

### 3. Verification

The dashboard should load, and the Status indicator should turn Connected. You should see live price updates and green/red flash animations as the data streams in.

## Stopping the Application

To stop the backend services run by Docker, return to the terminal running `docker compose up` and press:

Ctrl + C

Then, optionally run:
```
docker compose down
```
to clean up the network and containers.
