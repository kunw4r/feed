import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">
          Page not found
        </h1>
        <p className="text-zinc-400 text-[15px] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to feed
        </Link>
      </div>
    </div>
  );
}
