import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Message {
  from: "bot" | "user";
  text: string;
  image?: boolean;
}

const script: Message[] = [
  { from: "bot", text: "👋 Hi! I'm the Cemento bot. Send me a photo of your work and I'll log it for you." },
  { from: "user", text: "📷", image: true },
  { from: "bot", text: "Got it! I can see this is from the Kensington Mews project, milestone 4 — first fix electrical and plumbing." },
  { from: "bot", text: "Here's what I found:\n\n🔧 work type: rough-in\n👷 trade: plumbing\n📍 location: kitchen\n📐 stage: first fix\n✅ condition: good\n🧱 element: pipework" },
  { from: "bot", text: "Evidence submitted! You've now submitted 3 of 4 required items. Still needed: inspection certificate." },
];

export default function WhatsAppSim() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex < script.length) {
      const timer = setTimeout(() => {
        setMessages((prev) => [...prev, script[currentIndex]]);
        setCurrentIndex((prev) => prev + 1);
      }, currentIndex === 0 ? 500 : 1200);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const replay = () => {
    setMessages([]);
    setCurrentIndex(0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* WhatsApp-style header */}
      <div className="bg-success px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="font-mono text-[13px] text-success-foreground">← back</button>
        <p className="font-mono text-[14px] text-success-foreground">cemento bot</p>
        <div className="w-12" />
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-3 ${
              msg.from === "bot"
                ? "bg-background border border-border mr-auto"
                : "bg-success/10 ml-auto"
            }`}
          >
            {msg.image ? (
              <div className="w-full h-32 bg-secondary flex items-center justify-center">
                <span className="font-mono text-[11px] text-muted-foreground">photo</span>
              </div>
            ) : (
              <p className="font-sans text-[14px] text-foreground whitespace-pre-line">{msg.text}</p>
            )}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="px-6 pb-6 pt-3">
        {currentIndex >= script.length && (
          <Button variant="dark" size="full" onClick={replay}>
            <span className="font-sans text-[16px]">replay conversation</span>
          </Button>
        )}
      </div>
    </div>
  );
}
