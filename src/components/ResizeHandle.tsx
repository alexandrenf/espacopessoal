"use client";

import React from 'react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown }) => {
  return (
    <div
      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-50 transition-colors"
      onMouseDown={onMouseDown}
    />
  );
};

export default ResizeHandle;