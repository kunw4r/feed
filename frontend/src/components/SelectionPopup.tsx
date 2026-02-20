"use client";

import { useState, useEffect, useCallback } from "react";
import { HelpCircle } from "lucide-react";

interface SelectionPopupProps {
  onAsk: (selectedText: string) => void;
}

export default function SelectionPopup({ onAsk }: SelectionPopupProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 2 && text.length < 500) {
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          setPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
          });
          setSelectedText(text);
          setShow(true);
        }
      } else {
        setShow(false);
      }
    }, 10);
  }, []);

  const handleMouseDown = useCallback(() => {
    setShow(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [handleMouseUp, handleMouseDown]);

  if (!show) return null;

  return (
    <div
      className="fixed z-40 animate-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAsk(selectedText);
          setShow(false);
        }}
        className="flex items-center gap-1.5 bg-accent-bold text-white text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-lg hover:bg-accent-bold-hover transition-colors whitespace-nowrap"
      >
        <HelpCircle size={12} />
        Ask about this
      </button>
      <div className="flex justify-center">
        <div className="w-2 h-2 bg-accent-bold rotate-45 -mt-1" />
      </div>
    </div>
  );
}
