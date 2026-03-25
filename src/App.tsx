import React from 'react';
import { useChat } from './lib/useChat';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ChatArea } from './components/ChatArea';
import { Button } from './components/ui/Button';
import { Sparkles, LogIn } from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from './lib/utils';

export default function App() {
  const {
    user,
    loading,
    sessions,
    currentSessionId,
    setCurrentSessionId,
    messages,
    isStreaming,
    streamingMessage,
    apiKey,
    setApiKey,
    theme,
    setTheme,
    currentMode,
    setCurrentMode,
    discussionEnabled,
    setDiscussionEnabled,
    showSources,
    setShowSources,
    signIn,
    logOut,
    sendMessage,
    createSession,
    updateSessionTitle,
    deleteSession,
    clearAllSessions,
    cancelResponse,
    language,
    setLanguage,
    t
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground animate-bounce shadow-xl shadow-primary/20">
          <Sparkles size={24} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="font-bold text-lg tracking-tight">Nexus AI</p>
          <p className="text-xs text-muted-foreground animate-pulse">Initializing neural networks...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        
        <div className="max-w-md w-full space-y-8 text-center z-10">
          <div className="space-y-4">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Sparkles size={40} />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Nexus<span className="text-primary">AI</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                The most advanced collaborative AI chat platform.
              </p>
            </div>
          </div>

          <div className="p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Get Started</h2>
              <p className="text-sm text-muted-foreground">Sign in with your Google account to access Nexus AI and your chat history.</p>
            </div>
            <Button 
              onClick={signIn} 
              className="w-full h-12 text-lg gap-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <LogIn size={20} />
              Sign in with Google
            </Button>
            <p className="text-[10px] text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen w-full flex flex-col bg-background overflow-hidden", theme)}>
      <Navbar 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        apiKey={apiKey}
        onSetApiKey={setApiKey}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'id' ? 'en' : 'id')}
        t={t}
      />
      
      <div className="flex-1 flex overflow-hidden relative">
        <div className={cn(
          "absolute inset-y-0 left-0 z-40 transition-transform duration-300 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <Sidebar 
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={setCurrentSessionId}
            onNewChat={() => createSession()}
            onDeleteSession={(id) => {
              console.log('App: onDeleteSession called for:', id);
              deleteSession(id);
            }}
            onUpdateSessionTitle={updateSessionTitle}
            onClearAllSessions={clearAllSessions}
            onSignOut={logOut}
            user={user}
            currentMode={currentMode}
            onSetMode={setCurrentMode}
            discussionEnabled={discussionEnabled}
            onToggleDiscussion={() => setDiscussionEnabled(!discussionEnabled)}
            showSources={showSources}
            onToggleSources={() => setShowSources(!showSources)}
            t={t}
          />
        </div>

        {sidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 h-full overflow-hidden">
          <ChatArea 
            messages={messages}
            onSendMessage={sendMessage}
            isStreaming={isStreaming}
            streamingMessage={streamingMessage}
            apiKey={apiKey}
            onCancel={cancelResponse}
            showSources={showSources}
            t={t}
          />
        </main>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
