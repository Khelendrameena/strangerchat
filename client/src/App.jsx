import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./index.css";

const SERVER = import.meta.env.VITE_API_URL || "https://strangerchat-server.onrender.com";

const QUICK_EMOJIS = ["😂", "❤️", "👍", "😮", "🔥", "👋"];

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* Minimal SVG icons */
const IconChat = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconBolt = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconGhost = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
  </svg>
);

export default function App() {
  const [screen, setScreen] = useState("home");
  const [state, setState] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(0);
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
        setMessages((m) => [...m, { sys: true, text: "You are now connected to a stranger. Say hello." }]);
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
    socketRef.current.emit("find", { interests: [] });
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
      <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />

        <div className="relative z-10 flex flex-col items-center max-w-md w-full">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-600/25">
            <IconChat />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-3 text-center">
            StrangerChat
          </h1>
          <p className="text-zinc-400 mb-10 text-center leading-relaxed">
            Anonymous one-on-one conversations with random people.<br />No signup. No history. Just talk.
          </p>

          <button onClick={start}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition shadow-lg shadow-indigo-600/25 active:scale-[0.99]">
            Start Chatting
          </button>

          <div className="mt-6 flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-zinc-400 text-sm">{online} online now</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-10 w-full">
            {[
              { icon: <IconShield />, t: "Anonymous", d: "No accounts, no tracking" },
              { icon: <IconBolt />, t: "Instant", d: "Matched in seconds" },
              { icon: <IconGhost />, t: "Ephemeral", d: "Chats vanish on disconnect" },
            ].map(({ icon, t, d }) => (
              <div key={t} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 text-center">
                <div className="text-indigo-400 flex justify-center mb-2">{icon}</div>
                <div className="text-white text-sm font-semibold">{t}</div>
                <div className="text-zinc-500 text-xs mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- CHAT ---------------- */
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      <header className="sticky top-0 z-20 px-4 py-3 bg-[#0a0a0f]/90 backdrop-blur-lg border-b border-zinc-800/60">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                S
              </div>
              {state === "connected" && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]" />
              )}
            </div>
            <div>
              <div className="text-white font-semibold text-sm">
                {state === "connected" ? "Stranger" : state === "waiting" ? "Connecting" : "StrangerChat"}
              </div>
              <div className="text-xs text-zinc-500">
                {state === "connected" ? (
                  <span>{fmtDur(chatTime)} · <span className="text-emerald-400">Online</span></span>
                ) : state === "waiting" ? (
                  <span>Finding someone…</span>
                ) : (
                  <span>{online} online</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={next}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
              Next
            </button>
            <button onClick={stop}
              className="bg-zinc-800 hover:bg-red-900/60 text-zinc-300 hover:text-red-300 text-sm font-medium px-4 py-2.5 rounded-lg transition">
              End
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-5">
        <div className="max-w-3xl mx-auto">
          {state === "waiting" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 mb-5 border-[3px] border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-zinc-400 font-medium">Looking for a stranger…</p>
              <p className="text-zinc-600 text-sm mt-1">This usually takes a few seconds</p>
            </div>
          )}
          {state === "idle" && messages.length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <p>Stranger disconnected. Press <span className="text-zinc-300 font-medium">Next</span> to find someone new.</p>
            </div>
          )}
          {messages.map((m, i) =>
            m.sys ? (
              <div key={i} className="flex justify-center my-4">
                <span className="bg-zinc-800/60 text-zinc-400 text-xs px-4 py-1.5 rounded-full">{m.text}</span>
              </div>
            ) : (
              <div key={i} className={`flex mb-3 ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                {m.from !== "you" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold mr-2 shrink-0 self-end">
                    S
                  </div>
                )}
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed ${
                  m.from === "you"
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-zinc-800/80 text-zinc-100 rounded-bl-md"
                }`}>
                  <div className="break-words">{m.text}</div>
                  <div className={`text-[10px] mt-1 text-right ${m.from === "you" ? "text-indigo-200/70" : "text-zinc-500"}`}>
                    {formatTime(m.at || Date.now())}
                  </div>
                </div>
              </div>
            )
          )}
          {typing && (
            <div className="flex justify-start mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold mr-2 shrink-0">
                S
              </div>
              <div className="bg-zinc-800/80 px-4 py-3.5 rounded-2xl rounded-bl-md flex gap-1.5 items-center">
                <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 px-4 py-3 bg-[#0a0a0f]/90 backdrop-blur-lg border-t border-zinc-800/60">
        <div className="max-w-3xl mx-auto">
          {showEmoji && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 mb-2 flex gap-1 flex-wrap">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} onClick={() => onType(input + e)}
                  className="text-2xl p-1.5 hover:bg-zinc-700/50 rounded-lg transition">{e}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="shrink-0 w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xl transition text-zinc-300">
              {showEmoji ? "✕" : "☺"}
            </button>
            <input
              value={input}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={state === "connected" ? "Type a message…" : "Waiting for a stranger…"}
              disabled={state !== "connected"}
              maxLength={500}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40 transition"
            />
            <button onClick={send} disabled={state !== "connected" || !input.trim()}
              className="shrink-0 w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition active:scale-95">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
