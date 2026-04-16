import React from 'react';
import { motion } from 'motion/react';

export const MobileContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-zinc-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};
