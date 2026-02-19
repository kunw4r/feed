import { Zap } from "lucide-react";

interface WhyItMattersProps {
  text: string;
}

export default function WhyItMatters({ text }: WhyItMattersProps) {
  return (
    <div className="bg-violet-500/10 rounded-xl px-5 py-4 border border-violet-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-violet-400" />
        <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">
          Why should you care?
        </span>
      </div>
      <p className="text-[14px] text-zinc-300 leading-relaxed">{text}</p>
    </div>
  );
}
