import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedTextReplacementProps {
  original: string;
  replacement: string;
  onComplete: () => void;
}

export function AnimatedTextReplacement({ 
  original, 
  replacement,
  onComplete 
}: AnimatedTextReplacementProps) {
  return (
    <span className="relative inline-block">
      <AnimatePresence onExitComplete={onComplete}>
        {/* Original text that fades out */}
        <motion.span
          key="original"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="text-red-500 line-through absolute left-0"
        >
          {original}
        </motion.span>
        
        {/* New text that fades in */}
        <motion.span
          key="replacement"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3,
            delay: 0.1,
            ease: "easeOut"
          }}
          className="text-green-600 relative"
        >
          {replacement}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}