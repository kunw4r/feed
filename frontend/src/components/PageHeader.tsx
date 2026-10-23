import Link from "next/link";

interface PageHeaderProps {
  kicker?: string;
  title: React.ReactNode;
  standfirst?: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}

/** Shared editorial masthead for secondary pages. */
export default function PageHeader({ kicker, title, standfirst, back, children }: PageHeaderProps) {
  return (
    <header className="pt-10 md:pt-16 pb-10 md:pb-12">
      {back ? (
        <Link href={back.href} className="smallcaps text-[14px] text-content-faint hover:text-content transition-colors">
          ← {back.label}
        </Link>
      ) : (
        kicker && <p className="smallcaps text-[14px] text-content-faint">{kicker}</p>
      )}
      <h1 className="rise font-display mt-3 text-[2.8rem] md:text-[4.4rem] leading-[0.98] font-medium text-content text-balance">{title}</h1>
      {standfirst && (
        <p className="rise font-read mt-5 max-w-2xl text-[1.15rem] md:text-[1.25rem] leading-[1.5] text-content-dim text-pretty" style={{ animationDelay: "80ms" }}>
          {standfirst}
        </p>
      )}
      {children}
    </header>
  );
}
