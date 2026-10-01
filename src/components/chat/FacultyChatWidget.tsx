import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FacultyChatbotService, 
  ChatMessage, 
  ChatAction, 
  ChatbotConversationContext 
} from '../../services/facultyChatbotService';
import { Classroom } from '../../types';
import { 
  Sparkles, X, Send, Bot, RotateCcw, ChevronDown, 
  ArrowRight, ShieldCheck, Database, Maximize2, Minimize2, CheckCircle2 
} from 'lucide-react';

interface FacultyChatWidgetProps {
  currentClassroom?: Classroom | null;
}

const DEFAULT_SUGGESTED_QUERIES = [
  "Who is absent today?",
  "How many students are present?",
  "How many seats are empty?",
  "Show students with less than 75% attendance",
  "How many boys and girls?",
  "Are any students missing seats?",
  "Are there duplicate roll numbers?",
  "Who is sitting in the first row?",
  "Summarize this classroom"
];

export const FacultyChatWidget: React.FC<FacultyChatWidgetProps> = ({ currentClassroom }) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

  // Conversation context & message history
  const [context, setContext] = useState<ChatbotConversationContext>({
    facultyId: user?.id || ''
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I'm your **Faculty Real-Data Assistant**. I connect directly to your classroom database to give you instant, accurate answers about your students, cinema seating positions, and attendance.\n\nAsk me anything or choose a quick query below:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: "Who is absent today?", actionType: "filter", payload: { query: "Who is absent today?" } },
        { label: "Show empty seats", actionType: "filter", payload: { query: "How many seats are empty?" } },
        { label: "Attendance summary", actionType: "filter", payload: { query: "Give me today's attendance summary" } }
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync faculty ID if user changes
  useEffect(() => {
    if (user?.id) {
      setContext(prev => ({ ...prev, facultyId: user.id }));
    }
  }, [user?.id]);

  // Load faculty's classrooms
  useEffect(() => {
    if (!user || role !== 'faculty') return;

    const loadClassrooms = async () => {
      try {
        const clsList = await FacultyChatbotService.getFacultyClassrooms(user.id);
        setClassrooms(clsList);
        if (clsList.length > 0) {
          // If on a classroom detail page, auto-select that classroom
          const currentId = params.id || currentClassroom?.id;
          const matched = clsList.find(c => c.id === currentId);
          const activeId = matched ? matched.id : clsList[0].id;
          setSelectedClassroomId(activeId);
          setContext(prev => ({ ...prev, facultyId: user.id, currentClassroomId: activeId, lastClassroomId: activeId }));
        }
      } catch (e) {
        console.warn('Error loading classrooms for chatbot widget:', e);
      }
    };

    loadClassrooms();
  }, [user?.id, role, params.id, currentClassroom?.id]);

  // Sync selected classroom if prop changes
  useEffect(() => {
    if (currentClassroom?.id) {
      setSelectedClassroomId(currentClassroom.id);
      setContext(prev => ({ ...prev, currentClassroomId: currentClassroom.id, lastClassroomId: currentClassroom.id }));
    }
  }, [currentClassroom?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Global listener to open chat from any component or button
  useEffect(() => {
    if (!user || role !== 'faculty') return;

    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.query) {
        handleSendMessage(customEvent.detail.query);
      }
    };
    window.addEventListener('open-faculty-chat', handleOpen);
    return () => window.removeEventListener('open-faculty-chat', handleOpen);
  }, [selectedClassroomId, user?.id, role]);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || loading || !user) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const activeCtx: ChatbotConversationContext = {
        ...context,
        facultyId: user.id,
        currentClassroomId: selectedClassroomId
      };

      const result = await FacultyChatbotService.processFacultyQuery(promptText, activeCtx);

      const assistantMessage: ChatMessage = {
        id: `msg-resp-${Date.now()}`,
        sender: 'assistant',
        text: result.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: result.actions
      };

      setMessages(prev => [...prev, assistantMessage]);
      setContext(result.updatedContext);
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "I couldn't retrieve the latest classroom data. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: ChatAction) => {
    if (action.actionType === 'filter' && action.payload?.query) {
      handleSendMessage(action.payload.query as string);
    } else if (action.url) {
      navigate(action.url);
      // On mobile, close chat after navigating
      if (window.innerWidth < 640) {
        setIsOpen(false);
      }
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'reset',
        sender: 'assistant',
        text: `Conversation cleared. What would you like to know about **${selectedClassroom?.class_name || 'your classroom'}**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: "Who is absent today?", actionType: "filter", payload: { query: "Who is absent today?" } },
          { label: "Show empty seats", actionType: "filter", payload: { query: "How many seats are empty?" } },
          { label: "Class summary", actionType: "filter", payload: { query: "Summarize this classroom" } }
        ]
      }
    ]);
    if (user?.id) {
      setContext({ facultyId: user.id, currentClassroomId: selectedClassroomId });
    }
  };

  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId);

  // Markdown rendering helper
  const renderFormattedText = (text: string) => {
    // Simple, clean formatting for tables, bolding, and code tags
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let tableLines: string[] = [];
    let inTable = false;

    const flushTable = (key: string) => {
      if (tableLines.length === 0) return null;
      const headerLine = tableLines[0];
      const rowLines = tableLines.slice(2); // Skip separator line

      const headers = headerLine.split('|').filter(c => c.trim().length > 0).map(c => c.trim());

      const tableEl = (
        <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs bg-white">
            <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="py-2 px-2.5 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowLines.map((rowStr, rIdx) => {
                const cells = rowStr.split('|').filter(c => c.trim().length > 0).map(c => c.trim());
                return (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-2.5 text-slate-800">
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      tableLines = [];
      inTable = false;
      return tableEl;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        tableLines.push(trimmed);
      } else {
        if (inTable) {
          elements.push(flushTable(`tbl-${idx}`));
        }

        if (trimmed.startsWith('### ')) {
          elements.push(
            <h4 key={idx} className="text-xs sm:text-sm font-bold text-slate-900 mt-2 mb-1 flex items-center gap-1.5 font-display">
              {renderInlineFormatting(trimmed.replace('### ', ''))}
            </h4>
          );
        } else if (trimmed.startsWith('• ')) {
          elements.push(
            <div key={idx} className="text-xs text-slate-700 flex items-start gap-1.5 my-0.5 leading-relaxed">
              <span className="text-indigo-600 font-bold">•</span>
              <span>{renderInlineFormatting(trimmed.substring(2))}</span>
            </div>
          );
        } else if (trimmed.length === 0) {
          elements.push(<div key={idx} className="h-1.5" />);
        } else {
          elements.push(
            <p key={idx} className="text-xs text-slate-700 my-1 leading-relaxed">
              {renderInlineFormatting(trimmed)}
            </p>
          );
        }
      }
    });

    if (inTable) {
      elements.push(flushTable('tbl-end'));
    }

    return elements;
  };

  const renderInlineFormatting = (str: string) => {
    // Replaces bold **text**, code `text`
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px] font-bold border border-slate-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Only render UI for authenticated faculty users
  if (!user || role !== 'faculty') {
    return null;
  }

  return (
    <>
      {/* Floating Widget Launcher Button (Bottom Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-full p-3.5 sm:px-4 sm:py-3 shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2.5 group cursor-pointer border border-indigo-400/30 animate-in fade-in slide-in-from-bottom-4"
          aria-label="Open Faculty AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-700"></span>
          </div>
          <span className="text-xs font-bold tracking-tight hidden sm:inline-block">
            Ask Faculty AI
          </span>
          <span className="text-[10px] bg-indigo-500/80 text-white px-1.5 py-0.5 rounded-md font-mono hidden md:inline-block">
            Real DB
          </span>
        </button>
      )}

      {/* Interactive Chat Window Modal / Panel */}
      {isOpen && (
        <div 
          className={`fixed z-50 bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 ${
            isExpanded
              ? 'inset-3 sm:inset-10'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[440px] h-[580px] max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shadow-xs shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/80 text-amber-300 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight font-display">
                    Faculty AI Assistant
                  </h3>
                  <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Supabase Live
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1">
                  <span>Classroom Context:</span>
                  <select
                    value={selectedClassroomId}
                    onChange={e => {
                      setSelectedClassroomId(e.target.value);
                      setContext(prev => ({ ...prev, currentClassroomId: e.target.value, lastClassroomId: e.target.value }));
                    }}
                    className="bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-semibold focus:outline-hidden cursor-pointer"
                  >
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Clear Conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer hidden sm:block"
                title={isExpanded ? 'Restore Size' : 'Expand View'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer ml-1"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : msg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                  ) : (
                    <div>{renderFormattedText(msg.text)}</div>
                  )}

                  {/* Interactive Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleActionClick(act)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className={`text-[9px] block text-right mt-1 font-mono ${
                    msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-2xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse delay-150" />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse delay-300" />
                  <span className="text-xs text-slate-500 font-medium ml-1">Querying Supabase database...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Query Pills */}
          <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200/80 overflow-x-auto flex gap-1.5 shrink-0 scrollbar-none">
            {DEFAULT_SUGGESTED_QUERIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Ask about ${selectedClassroom ? selectedClassroom.class_name.split('—')[0].trim() : 'students, seats, attendance'}...`}
              disabled={loading}
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
