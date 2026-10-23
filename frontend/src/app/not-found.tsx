import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center px-4 md:px-10">
      <div>
        <p className="font-display italic text-accent text-[22px]">404</p>
        <h1 className="font-display mt-3 text-[3rem] md:text-[4.5rem] leading-none font-medium text-content">This page isn&apos;t in the edition.</h1>
        <p className="font-read mt-5 max-w-lg text-[1.15rem] text-content-dim">
          Stories move into the archive after a day or two, and older ones are cleared after a month.
        </p>
        <div className="mt-8 flex gap-6 text-[14px]">
          <Link href="/" className="rounded-full bg-content px-5 py-2.5 font-medium text-surface">Today&apos;s edition</Link>
          <Link href="/archive" className="py-2.5 text-content-dim hover:text-content">The archive →</Link>
        </div>
      </div>
    </div>
  );
}
