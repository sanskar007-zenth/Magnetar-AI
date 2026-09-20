import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
 

  const chatRef = useRef(null);
const abortControllerRef = useRef(null);
const textareaRef = useRef(null);

  const suggestions = [
    "Explain something difficult simply",
    "Help me understand an idea",
    "Explore a topic with me",
    "Help me brainstorm",
  ];

  const stopGeneration = () => {
    if (!abortControllerRef.current) return;

    setIsStopping(true);
    abortControllerRef.current.abort();
  };

  const startNewConversation = () => {
  setMessages([]);
  setMessage("");
};

const copyResponse = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error("Copy failed:", error);
  }
};

  const sendMessage = async (text = message) => {
    const trimmedMessage = text.trim();

    if (!trimmedMessage || isLoading) return;

    const history = messages.map((item) => ({
      role: item.role === "user" ? "user" : "assistant",
      content: item.text,
    }));

    
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmedMessage },
    ]);

    setMessage("");
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("https://magnetar-ai.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  message: trimmedMessage,
  history,
}),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to connect to MAGNETAR.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let aiStarted = false;

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop();

        for (const event of events) {
          const line = event
            .split("\n")
            .find((line) => line.startsWith("data:"));

          if (!line) continue;

          const data = JSON.parse(
            line.replace("data:", "").trim()
          );

          if (data.type === "text") {
            if (!aiStarted) {
              aiStarted = true;

              setMessages((prev) => [
                ...prev,
                {
                  role: "ai",
                  text: data.text,
                },
              ]);
            } else {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated.length - 1;

                updated[last] = {
                  ...updated[last],
                  text: updated[last].text + data.text,
                };

                return updated;
              });
            }
          }

          if (data.type === "error") {
            throw new Error(data.error);
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error(error);

      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];

        if (lastMessage?.role === "ai") {
          return prev;
        }

        return [
          ...prev,
          {
            role: "ai",
            text: "I couldn't connect to MAGNETAR right now. Please try again.",
          },
        ];
      });
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsStopping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
  const scrollToLatest = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  requestAnimationFrame(scrollToLatest);
}, [messages]);

  return (
    <main className="app">
      <header className="header">
  <h1>MAGNETAR</h1>

  {messages.length > 0 && (
    <button
      className="new-conversation"
      onClick={startNewConversation}
    >
      New conversation
    </button>
  )}
</header>

      {messages.length === 0 ? (
        <section className="welcome">
          <div className="welcome-content">
            <h2>Good evening.</h2>

            <p>What would you like to explore?</p>

            <div className="suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="chat" ref={chatRef}>
          {messages.map((item, index) => (
            <article
              key={index}
              className={`message ${
                item.role === "user"
                  ? "user-message"
                  : "ai-message"
              }`}
            >
              <span className="message-label">
                {item.role === "user" ? "You" : "MAGNETAR"}
              </span>

             {item.role === "ai" ? (
  <>
    <ReactMarkdown>{item.text}</ReactMarkdown>

    <button
      className="copy-button"
      onClick={() => copyResponse(item.text)}
    >
      Copy
    </button>
  </>
) : (
  <p>{item.text}</p>
)}
            </article>
          ))}

          {isLoading &&
            messages[messages.length - 1]?.role === "user" && (
              <article className="message ai-message">
                <span className="message-label">MAGNETAR</span>
                <p className="loading">
  {isStopping ? "Stopping…" : "···"}
</p>
              </article>
            )}
        </section>
      )}

      <div className="bottom-area">
        <div className="input-box">
          <textarea
  ref={textareaRef}
  value={message}
  onChange={(e) => {
    setMessage(e.target.value);

    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  }}
  onKeyDown={handleKeyDown}
  placeholder="Ask anything..."
  rows="1"
  disabled={isLoading}
/>

          <button
            className="send-button"
            onClick={
              isLoading
                ? stopGeneration
                : () => sendMessage()
            }
            disabled={!message.trim() && !isLoading}
            aria-label={
              isLoading
                ? "Stop generation"
                : "Send message"
            }
          >
            {isLoading ? "■" : "↑"}
          </button>
        </div>

        <footer>
          Designed & developed by Sanskar Bhardwaj
        </footer>
      </div>
    </main>
  );
}

export default App;