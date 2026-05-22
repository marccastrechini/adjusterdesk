"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-950">Something needs attention</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white">
        Try again
      </button>
    </div>
  );
}