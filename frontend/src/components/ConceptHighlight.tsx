"use client";

import { useState, useRef, useEffect } from "react";
import { Concept } from "@/lib/types";

interface ConceptHighlightProps {
  text: string;
  concepts: Concept[];
}

function Tooltip({
  concept,
  anchorRef,
  onClose,
}: {
  concept: Concept;
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: Math.max(16, rect.left + rect.width / 2 - 150),
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [anchorRef, onClose]);

  return (
    <div
      className="fixed z-30 w-[300px] bg-surface-raised rounded-xl shadow-lg border border-edge p-4 animate-in"
      style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wider bg-accent-soft px-1.5 py-0.5 rounded">
          Concept
        </span>
        <span className="text-[13px] font-semibold text-content">
          {concept.term}
        </span>
      </div>
      <p className="text-[13px] text-content-dim leading-relaxed mb-2">
        {concept.definition}
      </p>
      {concept.context && (
        <p className="text-[12px] text-content-faint leading-relaxed italic">
          In this story: {concept.context}
        </p>
      )}
    </div>
  );
}

export default function ConceptHighlight({
  text,
  concepts,
}: ConceptHighlightProps) {
  const [activeConcept, setActiveConcept] = useState<Concept | null>(null);
  const activeRef = useRef<HTMLSpanElement | null>(null);

  if (!concepts || concepts.length === 0) {
    return <>{text}</>;
  }

  const sortedConcepts = [...concepts].sort(
    (a, b) => b.term.length - a.term.length
  );
  const pattern = sortedConcepts
    .map((c) => c.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const concept = concepts.find(
          (c) => c.term.toLowerCase() === part.toLowerCase()
        );
        if (concept) {
          return (
            <span key={i} className="relative inline">
              <span
                ref={activeConcept === concept ? activeRef : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveConcept(activeConcept === concept ? null : concept);
                }}
                className="underline decoration-dotted decoration-accent/60 underline-offset-2 cursor-help hover:decoration-accent hover:bg-accent-soft transition-colors rounded-sm px-0.5 -mx-0.5"
              >
                {part}
              </span>
              {activeConcept === concept && (
                <Tooltip
                  concept={concept}
                  anchorRef={activeRef}
                  onClose={() => setActiveConcept(null)}
                />
              )}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
