import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { ai, SYSTEM_INSTRUCTION } from '../lib/gemini';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

export const AIChatView = () => {
  const { user, currency, plan } = useAuth();
  const { data: tasks } = useFirestore<any>('tasks');
  const { data: expenses } = useFirestore<any>('expenses');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const FREE_MESSAGE_LIMIT = 10;
  const isLimitReached = plan === 'free' && messages.filter(m => m.role === 'user').length >= FREE_MESSAGE_LIMIT;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `chats/${user.uid}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    if (isLimitReached) {
      toast.error("Daily message limit reached", {
        description: "Upgrade to Pro for unlimited messages and advanced AI features."
      });
      return;
    }

    const userMessage = {
      userId: user.uid,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString()
    };

    setInput('');
    setIsTyping(true);

    try {
      await addDoc(collection(db, `chats/${user.uid}/messages`), userMessage);

      // Prepare context for Gemini - Only for Pro users
      const context = plan === 'pro' ? `
Current User Data:
CURRENCY: ${currency}
TASKS: ${JSON.stringify(tasks.map(t => ({ title: t.title, completed: t.completed, dueDate: t.dueDate, category: t.category })))}
EXPENSES: ${JSON.stringify(expenses.map(e => ({ amount: e.amount, category: e.category, description: e.description, date: e.date })))}
` : `
(Context limited for free users. Upgrade to Pro to allow AI to see your tasks and expenses.)
`;

      const chat = ai.chats.create({
        model: plan === 'pro' ? "gemini-1.5-pro" : "gemini-1.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION + context
        },
        history: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      });

      const result = await chat.sendMessage({ message: input });
      const responseText = result.text;

      await addDoc(collection(db, `chats/${user.uid}/messages`), {
        userId: user.uid,
        role: 'assistant',
        content: responseText,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <header className="p-4 border-b border-border bg-card flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Sparkles size={16} className="text-primary-foreground" />
        </div>
        <h1 className="font-semibold tracking-tight">Nexa</h1>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-card rounded-lg flex items-center justify-center mx-auto shadow-sm border border-border">
                <Bot size={32} className="text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">How can I help you today?</p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">Ask me about your tasks, expenses, or for productivity tips.</p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-lg text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-none' 
                  : 'bg-card border border-border text-foreground rounded-tl-none shadow-sm'
              }`}>
                <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-card border border-border p-4 rounded-lg rounded-tl-none shadow-sm">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-card border-t border-border pb-24">
        {isLimitReached && (
          <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Limit Reached</p>
            </div>
            <p className="text-[9px] text-muted-foreground">Upgrade to Pro for unlimited chat</p>
          </div>
        )}
        <div className="relative flex items-center">
          <Input
            placeholder={isLimitReached ? "Limit reached..." : "Ask anything..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLimitReached}
            className="pr-12 h-12 rounded-lg bg-muted border-none focus-visible:ring-ring"
          />
          <Button 
            size="icon" 
            onClick={sendMessage}
            disabled={!input.trim() || isTyping || isLimitReached}
            className="absolute right-1.5 bg-primary hover:bg-primary/90 rounded-md w-9 h-9"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};
