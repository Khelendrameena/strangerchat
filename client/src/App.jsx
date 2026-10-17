import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./index.css";

const SERVER = import.meta.env.VITE_API_URL || "https://strangerchat-server.onrender.com";

const STRANGER_EMOJIS = ["🦊", "🐼", "🦁", "🐯", "🦄", "🐸", "🐙", "🦋", "🐝", "🦜"];
const QUICK_EMOJIS = ["😂", "❤️", "👍", "😮", "🔥", "👋"];

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [state, setState] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(0);
  const [interests, setInterests] = useState("");
  const [strangerEmoji] = useState(() => STRANGER_EMOJIS[Math.floor(Math.random() * STRANGER_EMOJIS.length)]);
  const [chatTime, setChatTime] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const chatTimer = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBvhR1/LMeSwFJHfH8N2QQAoUXrTp66hNRApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7yDzQ7EYAAA=");
    const s = io(SERVER);
    socketRef.current = s;
    s.on("online", ({ count }) => setOnline(count));
    s.on("status", ({ state }) => {
      setState(state);
      if (state === "connected") {
        setChatTime(0);
        chatTimer.current = setInterval(() => setChatTime((t) => t + 1), 1000);
        setMessages((m) => [...m, { sys: true, text: "You're now chatting with a stranger. Say hi! 👋" }]);
      } else {
        clearInterval(chatTimer.current);
      }
    });
    s.on("message", (m) => {
      setMessages((msgs) => [...msgs, m]);
      try { audioRef.current.play().catch(() => {}); } catch {}
    });
    s.on("system", (text) => setMessages((msgs) => [...msgs, { sys: true, text }]));
    s.on("typing", (t) => setTyping(t));
    return () => { s.disconnect(); clearInterval(chatTimer.current); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const start = () => {
    setMessages([]); setChatTime(0); setScreen("chat");
    const list = interests.split(",").map((x) => x.trim()).filter(Boolean);
    socketRef.current.emit("find", { interests: list });
  };
  const next = () => {
    setMessages([]); setTyping(false); setShowEmoji(false);
    socketRef.current.emit("next");
  };
  const stop = () => {
    socketRef.current.emit("stop");
    setScreen("home"); setMessages([]);
  };
  const send = () => {
    const text = input.trim();
    if (!text || state !== "connected") return;
    socketRef.current.emit("message", text);
    setMessages((m) => [...m, { text, from: "you", at: Date.now() }]);
    setInput(""); setShowEmoji(false);
    socketRef.current.emit("typing", false);
  };
  const onType = (v) => {
    setInput(v);
    socketRef.current.emit("typing", v.length > 0);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socketRef.current.emit("typing", false), 1500);
  };
  const fmtDur = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ---------------- HOME ---------------- */
  if (screen === "home") {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#08080d] flex flex-col items-center justify-center px-4">
        {/* ambient blobs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
          <div className="float text-7xl mb-6">💬</div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-3 text-center">
            Stranger<span className="animated-gradient bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">Chat</span>
          </h1>
          <p className="text-zinc-400 mb-8 text-center">
            Anonymous 1-on-1 conversations with random people.<br />No signup. No history. Just talk.
          </p>

          <div className="glass rounded-2xl p-5 w-full mb-5">
            <label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Interests (optional)</label>
            <input
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="music, coding, movies…"
              className="w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
            />
            <p className="text-zinc-600 text-xs mt-2">We'll try to match you with someone sharing an interest.</p>
          </div>

          <button onClick={start}
            className="btn-glow w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold px-10 py-4 rounded-2xl text-lg transition transform hover:scale-[1.02] active:scale-[0.98]">
            🚀 Start Chatting
          </button>

          <div className="mt-8 flex items-center gap-2.5 glass rounded-full px-5 py-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-zinc-300 text-sm font-medium">{online} people online</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8 w-full">
            {[["🔒", "Anonymous", "No accounts, no tracking"], ["⚡", "Instant", "Matched in seconds"], ["💨", "Ephemeral", "Chats vanish on disconnect"]].map(([e, t, d]) => (
              <div key={t} className="glass rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{e}</div>
                <div className="text-white text-xs font-semibold">{t}</div>
                <div className="text-zinc-500 text-[11px] mt-0.5">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- CHAT ---------------- */
  return (
    <div className="min-h-screen flex flex-col bg-[#08080d]">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl">
                {state === "connected" ? strangerEmoji : "❓"}
              </div>
              {state === "connected" && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#08080d]" />
              )}
            </div>
            <div>
              <div className="text-white font-semibold text-sm">
                {state === "connected" ? "Stranger" : state === "waiting" ? "Finding…" : "StrangerChat"}
              </div>
              <div className="text-xs">
                {state === "connected" ? (
                  <span className="text-zinc-400">⏱ {fmtDur(chatTime)} · <span className="text-green-400">online</span></span>
                ) : state === "waiting" ? (
                  <span className="text-yellow-400">Searching…</span>
                ) : (
                  <span className="text-zinc-500">{online} online</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={next} title="Next stranger"
              className="bg-zinc-800/80 hover:bg-violet-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition flex items-center gap-1.5">
              ⏭ <span className="hidden sm:inline">Next</span>
            </button>
            <button onClick={stop} title="End chat"
              className="bg-red-500/15 hover:bg-red-500/30 text-red-300 text-sm font-medium px-4 py-2.5 rounded-xl transition border border-red-500/20">
              ✕ <span className="hidden sm:inline">End</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-5">
        <div className="max-w-3xl mx-auto">
          {state === "waiting" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-20 h-20 mb-5">
                <div className="radar-ring absolute inset-0 rounded-full border-2 border-violet-500" />
                <div className="radar-ring absolute inset-0 rounded-full border-2 border-violet-500" style={{ animationDelay: "0.6s" }} />
                <div className="absolute inset-0 flex items-center justify-center text-4xl">🔍</div>
              </div>
              <p className="text-zinc-400 font-medium">Looking for a stranger…</p>
              <p className="text-zinc-600 text-sm mt-1">This usually takes a few seconds</p>
            </div>
          )}
          {state === "idle" && messages.length === 0 && (
            <div className="text-center py-16 text-zinc-600">
              <div className="text-5xl mb-4">👋</div>
              <p>Stranger disconnected. Hit <b className="text-zinc-400">Next</b> to find someone new.</p>
            </div>
          )}
          {messages.map((m, i) =>
            m.sys ? (
              <div key={i} className="flex justify-center my-4 msg-in">
                <span className="glass text-zinc-400 text-xs px-4 py-1.5 rounded-full">{m.text}</span>
              </div>
            ) : (
              <div key={i} className={`flex mb-3 msg-in ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                {m.from !== "you" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm mr-2 shrink-0 self-end">
                    {strangerEmoji}
                  </div>
                )}
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-lg ${
                  m.from === "you"
                    ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-br-md"
                    : "glass text-zinc-100 rounded-bl-md"
                }`}>
                  <div className="break-words">{m.text}</div>
                  <div className={`text-[10px] mt-1 text-right ${m.from === "you" ? "text-violet-200/70" : "text-zinc-500"}`}>
                    {formatTime(m.at || Date.now())}
                  </div>
                </div>
              </div>
            )
          )}
          {typing && (
            <div className="flex justify-start mb-3 msg-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm mr-2 shrink-0">
                {strangerEmoji}
              </div>
              <div className="glass px-4 py-3.5 rounded-2xl rounded-bl-md flex gap-1.5 items-center">
                <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 px-4 py-3 bg-[#08080d]/90 backdrop-blur-lg border-t border-zinc-800/60">
        <div className="max-w-3xl mx-auto">
          {showEmoji && (
            <div className="glass rounded-xl p-2 mb-2 flex gap-1 flex-wrap msg-in">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} onClick={() => onType(input + e)}
                  className="text-2xl p-1.5 hover:bg-zinc-700/50 rounded-lg transition">{e}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="shrink-0 w-12 h-12 glass rounded-xl text-xl hover:bg-zinc-700/40 transition">
              {showEmoji ? "⌨️" : "😊"}
            </button>
            <input
              value={input}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={state === "connected" ? "Type a message…" : "Waiting for a stranger…"}
              disabled={state !== "connected"}
              maxLength={500}
              className="flex-1 glass rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-40 transition"
            />
            <button onClick={send} disabled={state !== "connected" || !input.trim()}
              className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl transition transform active:scale-95 shadow-lg shadow-violet-600/30">
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
