"use client";

import React from "react";

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown }) => {
  return (
    <div
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-500 hover:opacity-50"
      onMouseDown={onMouseDown}
    />
  );
};

export default ResizeHandle;
