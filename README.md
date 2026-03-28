# PacketPulse DPI System

A high‑performance deep packet inspection (DPI) engine coupled with a modern, real-time React dashboard and FastAPI backend. 

This unified ecosystem parses Ethernet/IP/TCP/UDP traffic, extracts TLS SNI / HTTP hostnames, classifies flows by application, applies flexible blocking rules, and streams analytics in real-time to a beautiful web UI.

---

## 🚀 The Unified Full-Stack Ecosystem

PacketPulse has evolved from a standalone C++ tool into a comprehensive observability platform:

1. **C++ DPI Engine** (`/src` & `/include`): A high-speed packet analyzer that parses PCAPs, extracts five-tuples and SNIs, enforces blocking rules, and exports structured traffic JSON (`--json`).
2. **FastAPI Backend** (`/api`): A highly concurrent Python REST API that reads the engine's JSON output and streams network statistics continuously via WebSockets (`ws://localhost:8000/ws/live`).
3. **React Dashboard** (`/dashboard`): A premium, responsive frontend built with React, Vite, and Recharts. It connects to the global WebSocket context (`DPIContext.jsx`) to render buttery-smooth live traffic throughput, application distributions, and active network flow tables without manual polling.

---

## ⚡ Quick Start (Unified Launcher)

You can launch the entire ecosystem (Engine, API, and Dashboard) using the single unified coordinator script.

### Prerequisites
- **Node.js**: For the React Dashboard (`npm`)
- **Python 3.10+**: For FastAPI, Uvicorn, and Python scripts
- **Compiled C++ engine**: See the Build section below. *(Note: If the binary is missing, `start.py` will intelligently inject a live simulated data generator so you can still demo the UI instantly!)*

```bash
# 1. Install frontend dependencies
cd dashboard
npm install
cd ..

# 2. Install backend dependencies
cd api
pip install fastapi uvicorn pydantic websockets
cd ..

# 3. Launch the unified suite
python start.py
```

`start.py` will automatically launch the React client, FastAPI server, and gracefully terminate everything when you exit.
- **Dashboard UI**: http://localhost:5173
- **FastAPI / Swagger Docs**: http://localhost:8000/docs

---

## ⚙️ C++ Engine Features

- **Offline PCAP processing**: Reads standard `.pcap` captures from Wireshark, tcpdump, etc.
- **Deep inspection**:
  - TLS SNI extraction from ClientHello
  - HTTP `Host` header extraction for plaintext HTTP
  - Basic DNS query domain extraction
- **Rule‑based blocking**:
  - Block by source IP, destination port, application, or domain (with wildcards).
  - Flow‑level blocking: once a flow is marked blocked, all subsequent packets are dropped.
- **JSON Exporting**: Added built-in dependency-free JSON serialization (`json_exporter.h`) to bridge system memory directly into the web application.

### Building the Engine

You will need a C++17 compiler and **CMake 3.16+**. Windows users can see detailed compilation instructions in `WINDOWS_SETUP.md`.

```bash
# Configure and build Release
cmake -S . -B build
cmake --build build --config Release
```

Executables will be placed under the `build/` directory.

### Running Engine CLIs Manually

Assuming you built with the commands above and are in the project root:

**Single-threaded DPI engine (with JSON export):**
```bash
./build/dpi_single_thread_cli input.pcap filtered.pcap \
  --block-app YouTube \
  --block-ip 192.168.1.50 \
  --json output.json
```

**Multi-threaded DPI engine:**
```bash
./build/dpi_engine_cli input.pcap filtered.pcap \
  --block-app YouTube \
  --lbs 4 --fps 4
```
*(Use `--lbs` to control Load Balancer threads and `--fps` to control Fast Path workers).*

---

## 🏗️ Architecture Overview

At a high level, the internal C++ engine turns an input PCAP into a filtered output PCAP and a rich data export:

```text
Input PCAP ──► Parser & Classifier ──► Policy Engine ──► Output PCAP
                            │
                            └── JSON Exporter ──► output.json ──► FastAPI WebSocket ──► React UI
```

- **Core model (`types.*`)**
  - `FiveTuple` identifies a flow (src/dst IP, ports, protocol).
  - `Connection` tracks per-flow state, SNI/hostname, and counters.
  - `AppType` encodes application categories (YouTube, Facebook, DNS, …).

- **Multi-threaded Engine (`DPIEngine`)**
  - **Load balancers** distribute incoming `PacketJob` instances to Fast Path workers using consistent hashing on the five-tuple.
  - **Fast Path workers** inspect payloads (TLS/HTTP/DNS), classify flows, consult the `RuleManager`, and push allowed packets into the shared output queue.

---

## 📁 Repository Structure

```text
.
├── start.py                  # UNIFIED LAUNCHER: Spawns API, Dashboard, and Engine
├── api/                      # FASTAPI BACKEND
│   ├── main.py               # Uvicorn entrypoint and core server
│   ├── data_loader.py        # Connects FastAPI to the C++ JSON output
│   └── routes/               # REST handlers and WebSocket streaming endpoints
├── dashboard/                # REACT FRONTEND
│   ├── src/context/          # WebSockets state management (DPIContext)
│   ├── src/components/       # Recharts, UI visualizers, Flow Tables
│   └── src/pages/            # Dashboard mode layouts
├── include/                  # C++ ENGINE HEADERS
│   ├── json_exporter.h       # Bridging serialization logic
│   ├── dpi_engine.h          # Multi-threaded DPI orchestration
│   └── ...                   
├── src/                      # C++ ENGINE IMPLEMENTATION
│   ├── cli/                  # Executable entrypoints (single & multi thread)
│   └── ...                   
├── generate_test_pcap.py     # Script to generate sample PCAPs for testing
└── WINDOWS_SETUP.md          # Windows-specific C++ build instructions
```

---

## 🛠 Extending the Platform

- **Analytics Dashboard**: Add new Recharts components to `dashboard/src/components/` and pull expanded logic directly from `useDPI()` Context WebSocket.
- **Add App Signatures**: Extend `sniToAppType` in `src/types.cpp` with additional SNI patterns.
- **Custom Rule Sets**: Use `RuleManager::saveRules` / `loadRules` via the DPI engine APIs to persist IP / app / domain / port rules across runs.

---

### License & Contribution

This project serves as a complete high‑performance observation suite, a reference DPI implementation, and a robust learning tool for full-stack engineering. You can experiment with new heuristics, React visualizations, and WebSockets by building on the existing architecture.
