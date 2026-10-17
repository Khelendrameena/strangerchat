const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.get("/api/health", (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- Matching engine ---
const waiting = [];          // queue of socket ids looking for a partner
const pairs = new Map();     // socketId -> partnerId

function tryMatch(socket) {
  // Find a waiting stranger (optionally sharing an interest)
  const interests = socket.data.interests || [];
  let idx = waiting.findIndex((id) => {
    const s = io.sockets.sockets.get(id);
    if (!s) return false;
    if (!interests.length) return true;
    const theirs = s.data.interests || [];
    return theirs.some((t) => interests.includes(t));
  });
  if (idx === -1) idx = waiting.findIndex(() => true); // fallback: anyone
  if (idx === -1) {
    waiting.push(socket.id);
    socket.emit("status", { state: "waiting" });
    return;
  }
  const partnerId = waiting.splice(idx, 1)[0];
  pairs.set(socket.id, partnerId);
  pairs.set(partnerId, socket.id);
  socket.emit("status", { state: "connected" });
  io.to(partnerId).emit("status", { state: "connected" });
  broadcastCount();
}

function unpair(socket, notify = true) {
  const partnerId = pairs.get(socket.id);
  pairs.delete(socket.id);
  if (partnerId) {
    pairs.delete(partnerId);
    const p = io.sockets.sockets.get(partnerId);
    if (p && notify) {
      p.emit("status", { state: "disconnected" });
      p.emit("system", "Stranger disconnected.");
    }
  }
  const wi = waiting.indexOf(socket.id);
  if (wi !== -1) waiting.splice(wi, 1);
  broadcastCount();
}

function broadcastCount() {
  io.emit("online", { count: io.sockets.sockets.size });
}

io.on("connection", (socket) => {
  broadcastCount();

  socket.on("find", ({ interests } = {}) => {
    unpair(socket, false);
    socket.data.interests = (interests || []).map((s) => s.toLowerCase().trim()).filter(Boolean);
    tryMatch(socket);
  });

  socket.on("next", () => {
    unpair(socket);
    tryMatch(socket);
  });

  socket.on("stop", () => {
    unpair(socket);
    socket.emit("status", { state: "idle" });
  });

  socket.on("message", (text) => {
    const partnerId = pairs.get(socket.id);
    if (!partnerId || typeof text !== "string") return;
    const clean = text.slice(0, 500);
    if (!clean.trim()) return;
    io.to(partnerId).emit("message", { text: clean, from: "stranger", at: Date.now() });
  });

  socket.on("typing", (isTyping) => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) io.to(partnerId).emit("typing", !!isTyping);
  });

  socket.on("disconnect", () => unpair(socket));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`StrangerChat on :${PORT}`));
