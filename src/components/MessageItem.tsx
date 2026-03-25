import React from 'react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, ChevronDown, ChevronUp, Sparkles, Copy, Check, ExternalLink, Volume2, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  showSources?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isStreaming, showSources = true }) => {
  const [showThinking, setShowThinking] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const isUser = message.role === 'user';

  const sources = message.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || [];

  // Auto-expand thinking when streaming
  React.useEffect(() => {
    if (isStreaming && message.thinking) {
      setShowThinking(true);
    }
  }, [isStreaming, message.thinking]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadFile = (content: string, filename: string, type?: string) => {
    if (type === 'excel' || (content.includes('"type": "excel"') && content.includes('"data":'))) {
      try {
        const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
        const data = JSON.parse(jsonStr);
        if (data.type === 'excel' && Array.isArray(data.data)) {
          const ws = XLSX.utils.aoa_to_sheet(data.data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
          XLSX.writeFile(wb, data.filename || filename || 'data.xlsx');
          return;
        }
      } catch (e) {
        console.error("Failed to parse excel data", e);
      }
    }

    if (type === 'pdf' || (content.includes('"type": "pdf"') && content.includes('"content":'))) {
      try {
        const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
        const data = JSON.parse(jsonStr);
        if (data.type === 'pdf' && data.content) {
          const doc = new jsPDF();
          const splitTitle = doc.splitTextToSize(data.content, 180);
          doc.text(splitTitle, 10, 10);
          doc.save(data.filename || filename || 'document.pdf');
          return;
        }
      } catch (e) {
        const doc = new jsPDF();
        const splitTitle = doc.splitTextToSize(content, 180);
        doc.text(splitTitle, 10, 10);
        doc.save(filename || 'document.pdf');
        return;
      }
    }

    // Default for text-based files
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(message.content);
      
      // Try to find an Indonesian voice if possible
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.startsWith('id'));
      if (idVoice) utterance.voice = idVoice;
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Cleanup speech on unmount
  React.useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className={cn(
      "flex w-full gap-4 p-4 md:p-6 transition-colors",
      isUser ? "bg-background" : "bg-muted/50"
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
        isUser ? "bg-background" : "bg-primary text-primary-foreground"
      )}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">
              {isUser ? "You" : "Nexus AI"}
            </span>
            {!isUser && message.modelId && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20 flex items-center gap-1">
                <Sparkles size={10} />
                {message.modelId.split('-')[1].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isUser && (
              <button
                onClick={toggleSpeech}
                className={cn(
                  "p-1.5 transition-all rounded-md",
                  isSpeaking ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
                title={isSpeaking ? "Stop Reading" : "Read Aloud"}
              >
                <Volume2 size={14} className={cn(isSpeaking && "animate-pulse")} />
              </button>
            )}
            <button
              onClick={() => copyToClipboard(message.content)}
              className="p-1.5 text-muted-foreground hover:text-primary transition-all rounded-md hover:bg-primary/10"
              title="Copy Message"
            >
              {copied === message.content ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {message.thinking && (
          <div className="mb-2">
            <button 
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Thinking Process</span>
              </div>
              {showThinking ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 rounded-lg bg-muted text-xs font-mono text-muted-foreground border border-border/50 leading-relaxed italic">
                    {message.thinking}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className={cn(
          "markdown-body max-w-none",
          isStreaming && "streaming-cursor"
        )}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table({ children }) {
                return (
                  <div className="overflow-x-auto my-4 rounded-xl border border-border/50 shadow-sm bg-background/50 overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                      {children}
                    </table>
                  </div>
                );
              },
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                
                return !inline && match ? (
                  <div className="relative group/code my-4 rounded-xl overflow-hidden border border-border/50">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border/50">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">{match[1]}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadFile(codeString, `file.${match[1]}`, match[1])}
                          className="p-1 hover:text-primary transition-colors"
                          title="Download File"
                        >
                          <FileDown size={14} />
                        </button>
                        <button
                          onClick={() => copyToClipboard(codeString)}
                          className="p-1 hover:text-primary transition-colors"
                        >
                          {copied === codeString ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '0.8rem',
                        backgroundColor: 'transparent'
                      }}
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {showSources && sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <ExternalLink size={12} />
              <span>Sources</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((source: any, idx: number) => (
                <a
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border/50 flex items-center gap-1 max-w-[200px]"
                >
                  <span className="truncate">{source.title || source.uri}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
