import React from 'react';
import { Message, ModelId } from '../types';
import { MessageItem } from './MessageItem';
import { Button } from './ui/Button';
import { Send, Sparkles, Info, AlertCircle, Mic, MicOff, Square } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isStreaming: boolean;
  streamingMessage: Message | null;
  apiKey: string;
  onCancel: () => void;
  showSources?: boolean;
  t: any;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  streamingMessage,
  apiKey,
  onCancel,
  showSources = true,
  t
}) => {
  const [input, setInput] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + transcript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied.");
        } else {
          toast.error("Speech recognition error: " + event.error);
        }
      };
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming && apiKey) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  return (
    <div className="flex flex-col h-full relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        {messages.length === 0 && !streamingMessage ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 max-w-4xl mx-auto">
            <div className="relative w-full max-w-2xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-border/50 group">
              <img 
                src="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000" 
                alt="AI Concept" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                    <Sparkles size={24} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-2xl font-bold tracking-tight text-white">Nexus AI</h2>
                    <p className="text-xs text-white/70">Next Generation Intelligence</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight">Welcome to your workspace</h2>
              <p className="text-muted-foreground">
                Experience the next generation of AI chat. Multi-model collaboration, real-time thinking, and search grounding in one powerful interface.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {[
                { title: "Multi-Model Discussion", desc: "Three models collaborate for perfect answers", icon: <Sparkles className="text-amber-500" /> },
                { title: "Real-time Thinking", desc: "Watch the AI's reasoning process live", icon: <Info className="text-blue-500" /> },
                { title: "Search Grounding", desc: "Up-to-date info from Google Search", icon: <Info className="text-green-500" /> },
                { title: "Custom Modes", desc: "Optimized for code, research, or speed", icon: <Info className="text-purple-500" /> }
              ].map((feature, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/30 text-left hover:bg-muted/50 transition-colors cursor-default">
                  <div className="flex items-center gap-2 mb-1">
                    {feature.icon}
                    <h3 className="font-bold text-sm">{feature.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

            {!apiKey && (
              <div className="w-full p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center gap-3 text-left">
                <AlertCircle className="text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-destructive">API Key Required</p>
                  <p className="text-xs text-muted-foreground">Please enter your Gemini API key in the navbar to start chatting.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} showSources={showSources} />
            ))}
            {streamingMessage && (
              <MessageItem message={streamingMessage} isStreaming={true} showSources={showSources} />
            )}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent">
        <form 
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative group"
        >
          <AnimatePresence>
            {isStreaming && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 z-20"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  className="rounded-full bg-background/80 backdrop-blur-sm border-border/50 shadow-lg hover:bg-destructive/10 hover:text-destructive transition-all gap-2 px-4"
                >
                  <Square size={14} fill="currentColor" />
                  {t.cancel}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-border/50 bg-muted/50 focus-within:border-primary/50 focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/5 transition-all duration-300 shadow-lg">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={apiKey ? "Ask Nexus anything..." : "Enter API Key first..."}
              disabled={!apiKey || isStreaming}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm max-h-48 min-h-[44px]"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={toggleRecording}
                disabled={!apiKey || isStreaming}
                className={cn(
                  "rounded-xl h-10 w-10 transition-all duration-300",
                  isRecording ? "bg-red-500/10 text-red-500 animate-pulse" : "text-muted-foreground hover:text-primary"
                )}
                title={isRecording ? "Stop Recording" : "Voice to Text"}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isStreaming || !apiKey}
                className={cn(
                  "rounded-xl h-10 w-10 shrink-0 transition-all duration-300",
                  input.trim() ? "bg-primary scale-100" : "bg-muted scale-90"
                )}
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-center mt-3 text-muted-foreground">
            Nexus AI can make mistakes. Check important info.
          </p>
        </form>
      </div>
    </div>
  );
};
