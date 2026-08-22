import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  RotateCcw,
  ChevronDown,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { askAiCopilot } from '../services/aiService';

const SUGGESTIONS = [
  'How does Escrow hold my payment?',
  'What happens if credentials fail?',
  'What is the 5% platform fee?',
  'How do I list and transfer an account?',
];

const INITIAL_MESSAGE = {
  role: 'model',
  text: "👋 Hi! I'm **Socialy Copilot**, your AI guide for secure account trading and Escrow protection.\n\nAsk me anything about how buying, selling, 24-hour inspection, or dispute arbitration works!",
};

export const AiCopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, loading]);

  const handleSend = async (userText) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    const newHistory = [...messages, { role: 'user', text: textToSend }];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Send message along with previous chat session
      const historyPayload = messages
        .filter((m) => m !== INITIAL_MESSAGE)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await askAiCopilot(textToSend, historyPayload);
      const aiReply = res.reply || "I'm here to help! Could you please clarify your question?";

      setMessages((prev) => [...prev, { role: 'model', text: aiReply }]);
    } catch (err) {
      console.error('AI Copilot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: "⚠️ Sorry, I'm currently unable to reach the AI server. Please try asking again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
  };

  // Simple Markdown Parser for Bot Responses
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    return rawText.split('\n').map((line, lineIdx) => {
      // Header 3 (### Title)
      if (line.startsWith('### ')) {
        return (
          <h4 key={lineIdx} className="font-bold text-gray-900 text-xs mt-2 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }

      // Bullet points (- or *)
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.substring(2);
        return (
          <div key={lineIdx} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs text-gray-700">
            <span className="text-indigo-600 font-bold leading-tight">•</span>
            <span>{parseInlineFormatting(content)}</span>
          </div>
        );
      }

      // Numbered items (1. 2.)
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={lineIdx} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs text-gray-700">
            <span className="text-indigo-600 font-bold text-[11px]">{numMatch[1]}.</span>
            <span>{parseInlineFormatting(numMatch[2])}</span>
          </div>
        );
      }

      // Empty line -> break
      if (!line.trim()) {
        return <div key={lineIdx} className="h-1.5" />;
      }

      // Normal text paragraph
      return (
        <p key={lineIdx} className="text-xs text-gray-700 leading-relaxed my-0.5">
          {parseInlineFormatting(line)}
        </p>
      );
    });
  };

  // Helper for inline bold (**text**) and code (`text`)
  const parseInlineFormatting = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono text-indigo-700 border border-gray-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-90 font-sans">
      {/* Floating Action Button (Collapsed State) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Ask Socialy AI Copilot"
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-200 transform hover:scale-105 cursor-pointer"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
          </span>

          <div className="flex items-center gap-1.5">
            <Sparkles size={18} className="text-amber-300 animate-pulse" />
            <span className="text-sm font-bold tracking-wide">Ask AI Copilot</span>
          </div>
        </button>
      )}

      {/* Floating Chat Modal (Expanded State) */}
      {isOpen && (
        <div className="w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/15 rounded-xl backdrop-blur-xs text-white">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-none text-white">Socialy Copilot</h3>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-1.5 py-0.2 rounded-full font-semibold">
                    Escrow AI
                  </span>
                </div>
                <p className="text-[11px] text-indigo-100 mt-0.5 leading-none">
                  Instant answers on escrow, fees & dispute rules
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Clear Chat History"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize Copilot"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gray-50/50">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2`}
                >
                  {!isUser && (
                    <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5">
                      <Sparkles size={13} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                        : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-none'
                    }`}
                  >
                    {isUser ? msg.text : renderFormattedText(msg.text)}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-2 justify-start">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <Bot size={13} />
                </div>
                <div className="bg-white border border-gray-200 px-3.5 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-2xs text-xs text-gray-500 font-medium">
                  <Loader2 size={13} className="animate-spin text-indigo-600" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {/* Quick Suggestion Chips (when only initial message is shown) */}
            {messages.length === 1 && !loading && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Popular Questions
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(item)}
                      className="text-left text-xs bg-white hover:bg-indigo-50/70 border border-gray-200/80 hover:border-indigo-300 text-gray-700 hover:text-indigo-900 p-2.5 rounded-xl transition cursor-pointer flex items-center justify-between group"
                    >
                      <span>{item}</span>
                      <span className="text-gray-400 group-hover:text-indigo-600 transition">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-gray-100 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Socialy & Escrow..."
              disabled={loading}
              className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition cursor-pointer shadow-xs shrink-0"
              title="Send Message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AiCopilotWidget;
