import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./index.css";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function App() {
  const [screen, setScreen] = useState("home"); // home | chat
  const [state, setState] = useState("idle");   // idle | waiting | connected
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(0);
  const [interests, setInterests] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    const s = io(SERVER);
    socketRef.current = s;
    s.on("online", ({ count }) => setOnline(count));
    s.on("status", ({ state }) => {
      setState(state);
      if (state === "connected") {
        setMessages((m) => [...m, { sys: true, text: "You're now chatting with a stranger. Say hi! 👋" }]);
      }
    });
    s.on("message", (m) => setMessages((msgs) => [...msgs, m]));
    s.on("system", (text) => setMessages((msgs) => [...msgs, { sys: true, text }]));
    s.on("typing", (t) => setTyping(t));
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const start = () => {
    setMessages([]);
    setScreen("chat");
    const list = interests.split(",").map((x) => x.trim()).filter(Boolean);
    socketRef.current.emit("find", { interests: list });
  };
  const next = () => {
    setMessages([]);
    setTyping(false);
    socketRef.current.emit("next");
  };
  const stop = () => {
    socketRef.current.emit("stop");
    setScreen("home");
    setMessages([]);
  };
  const send = () => {
    const text = input.trim();
    if (!text || state !== "connected") return;
    socketRef.current.emit("message", text);
    setMessages((m) => [...m, { text, from: "you", at: Date.now() }]);
    setInput("");
    socketRef.current.emit("typing", false);
  };
  const onType = (v) => {
    setInput(v);
    socketRef.current.emit("typing", v.length > 0);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socketRef.current.emit("typing", false), 1500);
  };

  if (screen === "home") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-[#0a0a0f] via-[#12121a] to-[#0a0a0f]">
        <div className="text-6xl mb-4">💬</div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          Stranger<span className="text-violet-400">Chat</span>
        </h1>
        <p className="text-zinc-400 mb-8 text-center max-w-sm">
          Talk to random strangers. No signup, no history. Just conversations.
        </p>
        <input
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="Interests (optional, comma separated) — e.g. music, coding"
          className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 mb-4 focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={start}
          className="btn-glow bg-violet-600 hover:bg-violet-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition"
        >
          Start Chatting →
        </button>
        <div className="mt-8 flex items-center gap-2 text-zinc-500 text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {online} online now
        </div>
        <p className="mt-6 text-zinc-600 text-xs text-center max-w-sm">
          Be kind. Don't share personal info. Conversations are not saved.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#12121a]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <div className="text-white font-semibold text-sm">StrangerChat</div>
            <div className="text-xs flex items-center gap-1.5">
              {state === "connected" ? (
                <><span className="w-1.5 h-1.5 bg-green-500 rounded-full" /><span className="text-green-400">Connected</span></>
              ) : state === "waiting" ? (
                <><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" /><span className="text-yellow-400">Finding stranger…</span></>
              ) : (
                <span className="text-zinc-500">Disconnected</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs mr-1">{online} online</span>
          <button onClick={next} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg transition">
            Next ⏭
          </button>
          <button onClick={stop} className="bg-red-900/60 hover:bg-red-800 text-red-300 text-sm px-4 py-2 rounded-lg transition">
            Stop ✕
          </button>
        </div>
      </header>

      {/* messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 max-w-3xl w-full mx-auto">
        {state === "waiting" && (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
            <div className="text-4xl mb-3 animate-bounce">🔍</div>
            <p>Looking for a stranger…</p>
          </div>
        )}
        {messages.map((m, i) =>
          m.sys ? (
            <div key={i} className="text-center text-zinc-500 text-sm my-3 msg-in">{m.text}</div>
          ) : (
            <div key={i} className={`flex mb-3 msg-in ${m.from === "you" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed ${
                m.from === "you"
                  ? "bg-violet-600 text-white rounded-br-md"
                  : "bg-zinc-800 text-zinc-100 rounded-bl-md"
              }`}>
                {m.from !== "you" && <div className="text-[11px] text-violet-300 mb-0.5 font-medium">Stranger</div>}
                {m.text}
              </div>
            </div>
          )
        )}
        {typing && (
          <div className="flex justify-start mb-3">
            <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1">
              <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
              <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
              <span className="typing-dot w-2 h-2 bg-zinc-400 rounded-full" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="border-t border-zinc-800 bg-[#12121a] px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={state === "connected" ? "Type a message…" : "Wait for connection…"}
            disabled={state !== "connected"}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={state !== "connected" || !input.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 rounded-xl font-medium transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
