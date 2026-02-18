"use client";

import { Depth } from "@/lib/types";

interface DepthToggleProps {
  current: Depth;
  onChange: (depth: Depth) => void;
}

const DEPTHS: { value: Depth; label: string; disabled: boolean }[] = [
  { value: "quick", label: "Quick", disabled: false },
  { value: "standard", label: "Standard", disabled: false },
  { value: "deep", label: "Deep", disabled: true },
];

export default function DepthToggle({ current, onChange }: DepthToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
      {DEPTHS.map(({ value, label, disabled }) => (
        <button
          key={value}
          onClick={() => !disabled && onChange(value)}
          disabled={disabled}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            current === value
              ? "bg-neutral-900 text-white"
              : disabled
                ? "text-neutral-300 cursor-not-allowed"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
          }`}
          title={disabled ? "Coming soon" : undefined}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
