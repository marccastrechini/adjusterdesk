import Link from "next/link";
import { Card } from "@/components/ui";
import type { SignupSuccessCopy } from "@/lib/billing-display";

export function SignupSuccessPanel({ copy }: { copy: SignupSuccessCopy }) {
  return (
    <Card className="grid gap-3">
      <h1 className="text-2xl font-semibold text-slate-950">{copy.title}</h1>
      {copy.paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-6 text-slate-700">
          {paragraph}
        </p>
      ))}
      <div className="flex flex-wrap gap-3">
        <Link
          href={copy.primaryHref}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          {copy.primaryLabel}
        </Link>
        <Link
          href={copy.secondaryHref}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {copy.secondaryLabel}
        </Link>
      </div>
    </Card>
  );
}
