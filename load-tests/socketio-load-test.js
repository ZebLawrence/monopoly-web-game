/**
 * k6 Load Test — Monopoly Web Game (Socket.IO)
 *
 * Simulates 200 concurrent Socket.IO connections organized into 100 game rooms
 * (2 players per room). Each virtual user connects, creates or joins a room,
 * then loops: roll dice → wait for stateUpdate → end turn.
 *
 * Prerequisites:
 *   brew install k6          # macOS
 *   sudo apt install k6      # Debian/Ubuntu
 *
 * Usage:
 *   k6 run load-tests/socketio-load-test.js
 *   k6 run -e TARGET_URL=https://api.staging.example.com load-tests/socketio-load-test.js
 *   k6 run --duration 5m --vus 200 load-tests/socketio-load-test.js
 */

import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import ws from "k6/ws";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TARGET_URL = __ENV.TARGET_URL || "http://localhost:3001";
// Convert http(s) → ws(s) for WebSocket connection
const WS_URL = TARGET_URL.replace(/^http/, "ws");

export const options = {
  // Ramp up to 200 VUs, hold for 5 minutes, then ramp down
  stages: [
    { duration: "30s", target: 100 }, // ramp to 100 VUs (50 rooms)
    { duration: "30s", target: 200 }, // ramp to 200 VUs (100 rooms)
    { duration: "5m", target: 200 }, // hold at 200 VUs
    { duration: "30s", target: 0 }, // ramp down
  ],
  thresholds: {
    state_update_latency: ["p(99)<200"], // p99 < 200ms
    checks: ["rate>0.95"], // 95% of checks pass
    ws_connecting: ["p(95)<500"], // connection time p95 < 500ms
  },
};

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const stateUpdateLatency = new Trend("state_update_latency", true);
const roomsCreated = new Counter("rooms_created");
const roomsJoined = new Counter("rooms_joined");
const diceRolls = new Counter("dice_rolls");
const turnsEnded = new Counter("turns_ended");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Socket.IO uses an Engine.IO transport layer. The handshake starts with
 * an HTTP polling request, then upgrades to WebSocket. For k6 we connect
 * directly via WebSocket using the Engine.IO protocol:
 *
 *   - Packet type 0 = open
 *   - Packet type 2 = ping
 *   - Packet type 3 = pong
 *   - Packet type 4 = message
 *   - Socket.IO message type 0 = CONNECT
 *   - Socket.IO message type 2 = EVENT
 *
 * A Socket.IO EVENT packet looks like: 42["eventName", ...args]
 */

function encodeEvent(eventName, ...args) {
  return `42${JSON.stringify([eventName, ...args])}`;
}

function decodeMessage(data) {
  // Engine.IO message packet prefix is "4", Socket.IO event prefix is "2"
  if (typeof data !== "string") return null;

  // Engine.IO open packet
  if (data.startsWith("0")) {
    try {
      return { type: "open", payload: JSON.parse(data.substring(1)) };
    } catch {
      return { type: "open", payload: {} };
    }
  }

  // Engine.IO ping
  if (data === "2") return { type: "ping" };

  // Socket.IO connect acknowledgement
  if (data === "40") return { type: "connect" };

  // Socket.IO event: 42["eventName", ...data]
  if (data.startsWith("42")) {
    try {
      const parsed = JSON.parse(data.substring(2));
      return { type: "event", name: parsed[0], data: parsed.slice(1) };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Each VU is assigned a room based on its VU ID. VUs are paired:
 *   - Even VU IDs (0, 2, 4, ...) create a room
 *   - Odd VU IDs (1, 3, 5, ...) join the room created by (vuId - 1)
 *
 * Room codes are deterministic so paired VUs always target the same room.
 */
function getRoomId(vuId) {
  const roomIndex = Math.floor((vuId - 1) / 2);
  return `LOAD${String(roomIndex).padStart(4, "0")}`;
}

function isRoomCreator(vuId) {
  return vuId % 2 === 1; // VU IDs are 1-based in k6
}

// ---------------------------------------------------------------------------
// Main scenario
// ---------------------------------------------------------------------------

export default function () {
  const vuId = __VU;
  const roomId = getRoomId(vuId);
  const creator = isRoomCreator(vuId);
  const playerName = `Player_${vuId}`;
  const wsUrl = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;

  let connected = false;
  let rollTimestamp = 0;

  const res = ws.connect(wsUrl, {}, function (socket) {
    // Handle incoming messages
    socket.on("message", function (data) {
      const msg = decodeMessage(data);
      if (!msg) return;

      switch (msg.type) {
        case "open":
          // Engine.IO opened — send Socket.IO connect packet
          socket.send("40");
          break;

        case "ping":
          // Respond to Engine.IO ping with pong
          socket.send("3");
          break;

        case "connect":
          // Socket.IO connected — create or join a room
          connected = true;
          if (creator) {
            socket.send(
              encodeEvent("createRoom", {
                playerName: playerName,
                roomCode: roomId,
              })
            );
            roomsCreated.add(1);
          } else {
            // Small delay so the creator has time to set up the room
            sleep(1);
            socket.send(
              encodeEvent("joinRoom", {
                playerName: playerName,
                roomCode: roomId,
              })
            );
            roomsJoined.add(1);
          }
          break;

        case "event":
          handleGameEvent(socket, msg);
          break;
      }
    });

    // Game event handler
    function handleGameEvent(sock, msg) {
      switch (msg.name) {
        case "roomCreated":
        case "roomJoined":
          // Wait for game to start — the server auto-starts when 2 players join
          break;

        case "gameStarted":
          // Small delay then start playing
          sleep(0.5);
          break;

        case "stateUpdate": {
          // Measure latency from dice roll to state update
          if (rollTimestamp > 0) {
            const latency = Date.now() - rollTimestamp;
            stateUpdateLatency.add(latency);
            rollTimestamp = 0;
          }

          // Check if it's our turn based on state
          const state = msg.data && msg.data[0];
          if (state && state.currentPlayerId) {
            // Simulate a game turn after a short think time
            sleep(Math.random() * 2 + 0.5); // 0.5–2.5s think time

            // Roll dice
            rollTimestamp = Date.now();
            sock.send(encodeEvent("gameAction", { type: "rollDice" }));
            diceRolls.add(1);

            // Wait for state update, then end turn
            sleep(1);
            sock.send(encodeEvent("gameAction", { type: "endTurn" }));
            turnsEnded.add(1);
          }
          break;
        }

        case "error":
          console.warn(`[VU ${vuId}] Server error: ${JSON.stringify(msg.data)}`);
          break;
      }
    }

    // Keep the connection open for the iteration duration
    // Each iteration simulates ~10 turns then disconnects
    socket.setTimeout(function () {
      socket.close();
    }, 30000); // 30 second session per VU iteration
  });

  check(res, {
    "WebSocket connected (status 101)": (r) => r && r.status === 101,
  });

  // Brief pause between iterations
  sleep(1);
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export function setup() {
  console.log(`Load test targeting: ${TARGET_URL}`);
  console.log(`WebSocket URL: ${WS_URL}/socket.io/?EIO=4&transport=websocket`);
  console.log("Simulating 200 VUs across 100 rooms (2 per room)");
  return {};
}

export function teardown() {
  console.log("Load test complete. Review metrics above.");
}
