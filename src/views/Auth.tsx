import React from 'react';
import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '../lib/firebase';
import { LogIn, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const AuthView = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <div className="w-20 h-20 bg-primary rounded-lg flex items-center justify-center mb-6 mx-auto shadow-2xl shadow-primary/10">
          <Sparkles size={40} className="text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-light tracking-tight mb-2">Life Admin <span className="font-bold">AI</span></h1>
        <p className="text-muted-foreground font-light">Your personal operations center.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-xs space-y-4"
      >
        <Button 
          onClick={signInWithGoogle}
          className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-lg font-medium flex items-center justify-center gap-3"
        >
          <LogIn size={20} />
          Sign in with Google
        </Button>
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Secure Authentication via Firebase</p>
      </motion.div>
    </div>
  );
};
