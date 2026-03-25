import React from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Menu, Sun, Moon, Key, X, Sparkles, Github, Languages } from 'lucide-react';
import { cn } from '../lib/utils';
import { Language } from '../lib/translations';

interface NavbarProps {
  onToggleSidebar: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiKey: string;
  onSetApiKey: (key: string) => void;
  language: Language;
  onToggleLanguage: () => void;
  t: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  theme,
  onToggleTheme,
  apiKey,
  onSetApiKey,
  language,
  onToggleLanguage,
  t
}) => {
  const [showKeyInput, setShowKeyInput] = React.useState(false);
  const [tempKey, setTempKey] = React.useState(apiKey);

  const handleSaveKey = () => {
    onSetApiKey(tempKey);
    setShowKeyInput(false);
  };

  return (
    <nav className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden">
          <Menu size={20} />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:inline-block">
            Nexus<span className="text-primary">AI</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Button 
            variant={apiKey ? "ghost" : "destructive"} 
            size="sm" 
            className="gap-2"
            onClick={() => setShowKeyInput(!showKeyInput)}
          >
            <Key size={16} />
            <span className="hidden sm:inline">{apiKey ? t.settings : t.apiKey}</span>
          </Button>

          {showKeyInput && (
            <div className="absolute right-0 mt-2 w-72 p-4 bg-card border border-border rounded-lg shadow-xl z-50 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.apiKey}</p>
                <button onClick={() => setShowKeyInput(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3">
                <Input 
                  type="password" 
                  placeholder="Paste your key here..." 
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs" onClick={handleSaveKey}>{t.confirm}</Button>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs">Get Key</Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={onToggleLanguage} className="gap-2 px-2">
          <Languages size={18} />
          <span className="text-xs font-bold uppercase">{language}</span>
        </Button>

        <Button variant="ghost" size="icon" onClick={onToggleTheme}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </Button>
        
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hidden sm:block">
          <Button variant="ghost" size="icon">
            <Github size={20} />
          </Button>
        </a>
      </div>
    </nav>
  );
};
