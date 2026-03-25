import React from 'react';
import { ChatSession, ChatMode, ModelId } from '../types';
import { Button } from './ui/Button';
import { Plus, MessageSquare, Trash2, Settings, LogOut, Sparkles, Zap, Code, Search, Layout, Check, Pencil, X, FileDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { MODES, MODELS } from '../lib/gemini';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateSessionTitle: (id: string, title: string) => void;
  onClearAllSessions: () => void;
  onSignOut: () => void;
  user: any;
  currentMode: ChatMode;
  onSetMode: (mode: ChatMode) => void;
  discussionEnabled: boolean;
  onToggleDiscussion: () => void;
  showSources: boolean;
  onToggleSources: () => void;
  t: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onUpdateSessionTitle,
  onClearAllSessions,
  onSignOut,
  user,
  currentMode,
  onSetMode,
  discussionEnabled,
  onToggleDiscussion,
  showSources,
  onToggleSources,
  t
}) => {
  const modeIcons = {
    fast: <Zap size={16} />,
    programmer_mini: <Code size={16} />,
    programmer_complex: <Code size={16} />,
    creative: <Sparkles size={16} />,
    researcher: <Search size={16} />,
    file_generator: <FileDown size={16} />
  };

  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [confirmClearAll, setConfirmClearAll] = React.useState(false);

  const handleStartEdit = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title || '');
  };

  const handleSaveEdit = (e: React.FormEvent | React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onUpdateSessionTitle(id, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  return (
    <div className="flex flex-col h-full w-64 md:w-72 bg-muted/30 border-r border-border/50">
      <div className="p-4 space-y-4">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2 shadow-sm"
          variant="primary"
        >
          <Plus size={18} />
          {t.newChat}
        </Button>

        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">
            {t.chatModes}
          </p>
          <div className="grid grid-cols-1 gap-1">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onSetMode(mode.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all",
                  currentMode === mode.id 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {modeIcons[mode.id]}
                {mode.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <button
            onClick={onToggleDiscussion}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all border",
              discussionEnabled 
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            )}
            title="Combine multiple models for better answers"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={16} className={discussionEnabled ? "animate-pulse" : ""} />
              {t.multiModel}
            </div>
            <div className={cn(
              "w-8 h-4 rounded-full relative transition-colors",
              discussionEnabled ? "bg-primary" : "bg-muted"
            )}>
              <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                discussionEnabled ? "left-4.5" : "left-0.5"
              )} />
            </div>
          </button>

          <button
            onClick={onToggleSources}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all border",
              showSources 
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            )}
            title="Show or hide grounding sources"
          >
            <div className="flex items-center gap-2">
              <Search size={16} />
              {t.showSources}
            </div>
            <div className={cn(
              "w-8 h-4 rounded-full relative transition-colors",
              showSources ? "bg-primary" : "bg-muted"
            )}>
              <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                showSources ? "left-4.5" : "left-0.5"
              )} />
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t.history}
          </p>
          {sessions.length > 0 && (
            <div className="flex items-center gap-2">
              {confirmClearAll ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      onClearAllSessions();
                      setConfirmClearAll(false);
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-destructive hover:underline"
                  >
                    {t.confirm}
                  </button>
                  <button 
                    onClick={() => setConfirmClearAll(false)}
                    className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmClearAll(true)}
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
                >
                  {t.clearAll}
                </button>
              )}
            </div>
          )}
        </div>
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground italic">
            {t.noChats}
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-all",
                currentSessionId === session.id 
                  ? "bg-accent text-accent-foreground" 
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onSelectSession(session.id)}
            >
              <MessageSquare size={16} className="shrink-0" />
              {editingSessionId === session.id ? (
                <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(e, session.id);
                      if (e.key === 'Escape') handleCancelEdit(e as any);
                    }}
                    className="flex-1 bg-background border border-primary/30 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button 
                    onClick={(e) => handleSaveEdit(e, session.id)}
                    className="p-1 text-primary hover:bg-primary/10 rounded"
                  >
                    <Check size={12} />
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="p-1 text-muted-foreground hover:bg-muted rounded"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 truncate text-xs font-medium">
                    {session.title || "Untitled Chat"}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 transition-opacity",
                    confirmDeleteId === session.id || currentSessionId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {confirmDeleteId === session.id ? (
                      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm border border-destructive/20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                            setConfirmDeleteId(null);
                          }}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title={t.confirm}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="p-1 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                          title={t.cancel}
                        >
                          <Plus size={14} className="rotate-45" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => handleStartEdit(e, session)}
                          className="p-1.5 hover:text-primary transition-all rounded-md hover:bg-primary/10 shrink-0"
                          title="Edit Title"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(session.id);
                          }}
                          className="p-1.5 hover:text-destructive transition-all rounded-md hover:bg-destructive/10 shrink-0"
                          title="Delete Chat"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/30">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" />
            ) : (
              user?.displayName?.[0] || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{user?.displayName || 'User'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/30 flex flex-col gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={onSignOut}
          >
            <LogOut size={16} />
            {t.signOut}
          </Button>
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground/50 tracking-widest uppercase">Nexus AI v2.0</span>
            <span className="text-[10px] font-medium text-primary/40">Vercel Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
