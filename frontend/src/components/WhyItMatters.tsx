import { Zap } from "lucide-react";

interface WhyItMattersProps {
  text: string;
}

export default function WhyItMatters({ text }: WhyItMattersProps) {
  return (
    <div className="bg-accent-soft rounded-xl px-5 py-4 border border-edge-accent">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-accent" />
        <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">
          Why should you care?
        </span>
      </div>
      <p className="text-[14px] text-content-dim leading-relaxed">{text}</p>
    </div>
  );
}
