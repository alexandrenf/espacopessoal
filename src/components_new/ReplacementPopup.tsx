import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '../components_new/ui/button';

interface ReplacementPopupProps {
  word: string;
  replacement: string;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Displays a popup suggesting a replacement for a word, allowing the user to accept or reject the suggestion.
 *
 * Shows the original word and its suggested replacement, with buttons to confirm or dismiss the change.
 */
export function ReplacementPopup({ word, replacement, onAccept, onReject }: ReplacementPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed left-1/2 top-[120px] z-30 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg border border-gray-200/50 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="text-red-500">{word}</span>
        <span>→</span>
        <span className="text-green-500">{replacement}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAccept}
          className="h-6 w-6 p-0 hover:bg-green-50"
        >
          <Check className="h-3 w-3 text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          className="h-6 w-6 p-0 hover:bg-red-50"
        >
          <X className="h-3 w-3 text-red-500" />
        </Button>
      </div>
    </motion.div>
  );
}
