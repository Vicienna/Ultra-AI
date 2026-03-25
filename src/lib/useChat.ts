import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { auth, db, signIn, logOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { ChatSession, Message, ChatMode, ModelId } from '../types';
import { generateAIResponse, generateCollaborativeResponse, generateProgrammerResponse } from './gemini';
import { toast } from 'sonner';
import { translations, Language } from './translations';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useChat() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  
  // Settings
  const [apiKey, setApiKey] = useState(() => 
    import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('nexus_api_key') || ''
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    (localStorage.getItem('nexus_theme') as 'light' | 'dark') || 'dark'
  );
  const [currentMode, setCurrentMode] = useState<ChatMode>('fast');
  const [discussionEnabled, setDiscussionEnabled] = useState(false);
  const [showSources, setShowSources] = useState(() => 
    localStorage.getItem('nexus_show_sources') !== 'false'
  );
  const [language, setLanguage] = useState<Language>(() => 
    (localStorage.getItem('nexus_language') as Language) || 'id'
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const t = useMemo(() => translations[language], [language]);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Settings persistence
  useEffect(() => {
    localStorage.setItem('nexus_show_sources', String(showSources));
  }, [showSources]);

  // Sessions
  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      setSessions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sessions');
    });

    return unsubscribe;
  }, [user]);

  // Messages
  useEffect(() => {
    if (!currentSessionId || !user) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('sessionId', '==', currentSessionId),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'messages');
    });

    return unsubscribe;
  }, [currentSessionId]);

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('nexus_theme', theme);
  }, [theme]);

  // API Key
  useEffect(() => {
    localStorage.setItem('nexus_api_key', apiKey);
  }, [apiKey]);

  // Language persistence
  useEffect(() => {
    localStorage.setItem('nexus_language', language);
  }, [language]);

  const createSession = async (title: string = 'New Chat') => {
    if (!user) return null;
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        title,
        userId: user.uid,
        mode: currentMode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setCurrentSessionId(docRef.id);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
      return null;
    }
  };

  const updateSessionTitle = async (id: string, title: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'sessions', id), { 
        title,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'sessions');
    }
  };

  const deleteSession = async (id: string) => {
    console.log('Attempting to delete session:', id);
    if (!user) {
      console.error('No user found in deleteSession');
      return;
    }
    
    toast.info('Deleting chat...');
    try {
      await deleteDoc(doc(db, 'sessions', id));
      console.log('Session document deleted successfully');
      
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
      
      // Delete messages
      const q = query(
        collection(db, 'messages'), 
        where('sessionId', '==', id),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.size} messages to delete`);
      
      const deletePromises = snapshot.docs.map(m => deleteDoc(doc(db, 'messages', m.id)));
      await Promise.all(deletePromises);
      console.log('All associated messages deleted');
      
      toast.success(t.chatDeleted);
    } catch (error) {
      console.error('Error in deleteSession:', error);
      toast.error(t.failedToDelete);
      handleFirestoreError(error, OperationType.DELETE, 'sessions');
    }
  };

  const clearAllSessions = async () => {
    if (!user) return;
    
    try {
      const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      console.log(`Clearing all ${snapshot.size} sessions...`);
      
      const deletePromises = snapshot.docs.map(async (s) => {
        // Delete session
        await deleteDoc(doc(db, 'sessions', s.id));
        
        // Delete associated messages
        const mq = query(
          collection(db, 'messages'), 
          where('sessionId', '==', s.id),
          where('userId', '==', user.uid)
        );
        const mSnapshot = await getDocs(mq);
        const mDeletePromises = mSnapshot.docs.map(m => deleteDoc(doc(db, 'messages', m.id)));
        await Promise.all(mDeletePromises);
      });
      
      await Promise.all(deletePromises);
      setCurrentSessionId(null);
      toast.success(t.allChatsCleared);
    } catch (error) {
      console.error('Error in clearAllSessions:', error);
      toast.error(t.failedToClear);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user || !apiKey) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createSession(content.slice(0, 30) + '...');
    }
    if (!sessionId) return;

    // Add user message
    const userMsg: any = {
      sessionId,
      userId: user.uid,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    try {
      await addDoc(collection(db, 'messages'), userMsg);
      await updateDoc(doc(db, 'sessions', sessionId), { updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }

    setIsStreaming(true);
    const initialStreamingMsg: Message = {
      id: 'streaming',
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      thinking: discussionEnabled ? 'Initializing multi-model discussion...' : t.thinking
    };
    setStreamingMessage(initialStreamingMsg);

    try {
      let finalResponse = { text: '', thinking: '' };

      if (discussionEnabled) {
        finalResponse = await generateCollaborativeResponse(
          apiKey,
          content,
          (step, text, thinking) => {
            setStreamingMessage(prev => {
              if (!prev) return initialStreamingMsg;
              return {
                ...prev,
                content: text || prev.content || '',
                thinking: thinking || prev.thinking || step
              };
            });
          },
          signal
        );
      } else if (currentMode === 'programmer_mini' || currentMode === 'programmer_complex') {
        finalResponse = await generateProgrammerResponse(
          apiKey,
          [...messages, userMsg],
          currentMode as any,
          (step, text, thinking) => {
            // Map step to translation if available
            const translatedStep = (t.programmerMode as any)[step] || step;
            setStreamingMessage(prev => {
              if (!prev) return initialStreamingMsg;
              return {
                ...prev,
                content: text || prev.content || '',
                thinking: thinking || prev.thinking || translatedStep
              };
            });
          },
          signal
        );
      } else {
        let modelId: ModelId = 'gemini-3-flash-preview';
        if (currentMode === 'fast') modelId = 'gemini-3.1-flash-lite-preview';
        if (currentMode === 'file_generator') modelId = 'gemini-3-flash-preview';
        
        finalResponse = await generateAIResponse(
          apiKey,
          modelId,
          [...messages, userMsg],
          currentMode,
          (text, thinking) => {
            setStreamingMessage(prev => ({
              ...prev!,
              content: text,
              thinking: thinking || prev?.thinking
            }));
          },
          signal
        );
      }

      // Save assistant message
      try {
        await addDoc(collection(db, 'messages'), {
          sessionId,
          userId: user.uid,
          role: 'assistant',
          content: finalResponse.text,
          thinking: finalResponse.thinking,
          groundingMetadata: (finalResponse as any).groundingMetadata || null,
          modelId: discussionEnabled ? 'gemini-3-flash-preview' : (currentMode === 'fast' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3-flash-preview'),
          timestamp: Date.now(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'messages');
      }

    } catch (error: any) {
      if (error?.message === 'Aborted') {
        console.log('Response generation cancelled by user');
        return;
      }
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        toast.error(t.quotaExceeded, {
          duration: 5000,
          description: t.quotaExceededDesc
        });
      } else if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('invalid API key')) {
        toast.error(t.invalidApiKey, {
          duration: 5000
        });
      } else {
        toast.error(t.failedToGenerate);
      }
      console.error('Gemini API Error details:', error);
    } finally {
      setIsStreaming(false);
      setStreamingMessage(null);
      abortControllerRef.current = null;
    }
  };

  const cancelResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamingMessage(null);
      toast.info('Generation cancelled');
    }
  };

  return {
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
  };
}
