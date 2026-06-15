"use client";

import { useState } from "react";
import type { EmailAudience, SystemEmailTemplateDescriptor } from "@/lib/system-email-templates";
import { Badge, Card } from "@/components/ui";

type Props = {
  templates: SystemEmailTemplateDescriptor[];
};

const audienceBadgeTone: Record<EmailAudience, "blue" | "slate"> = {
  customer: "blue",
  internal: "slate",
};

export function SystemEmailPreviewPanel({ templates }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"html" | "text">("html");

  const active = templates.find((t) => t.id === activeId) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <div className="grid gap-3 content-start">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={
              activeId === template.id
                ? "cursor-pointer border-teal-400 bg-teal-50"
                : "cursor-pointer hover:border-slate-300"
            }
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                setActiveId(template.id);
                setTab("html");
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-950">{template.name}</p>
                <Badge tone={audienceBadgeTone[template.audience]}>
                  {template.audience === "customer" ? "Customer" : "Internal"}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{template.description}</p>
              <p className="mt-1 text-xs text-slate-500 truncate">Subject: {template.subject}</p>
            </button>
          </Card>
        ))}
      </div>

      <div>
        {active ? (
          <div className="grid gap-4">
            <Card className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">{active.name}</h2>
                <Badge tone={audienceBadgeTone[active.audience]}>
                  {active.audience === "customer" ? "Customer" : "Internal"}
                </Badge>
              </div>

              <dl className="grid gap-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-500">Subject</dt>
                  <dd className="text-slate-950">{active.subject}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-500">From</dt>
                  <dd className="text-slate-950">{active.from}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-slate-500">Reply-to</dt>
                  <dd className="text-slate-950">{active.replyTo}</dd>
                </div>
              </dl>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-normal mb-1.5">Sample data</p>
                <dl className="grid gap-1 text-sm">
                  {Object.entries(active.sampleDataLabels).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <dt className="shrink-0 font-mono text-xs text-slate-500 pt-0.5">{key}</dt>
                      <dd className="text-slate-700 text-xs break-all">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
                <button
                  type="button"
                  className={tab === "html" ? "text-sm font-semibold text-teal-700 border-b-2 border-teal-600 pb-1" : "text-sm text-slate-500 hover:text-slate-700 pb-1"}
                  onClick={() => setTab("html")}
                >
                  HTML preview
                </button>
                <button
                  type="button"
                  className={tab === "text" ? "text-sm font-semibold text-teal-700 border-b-2 border-teal-600 pb-1" : "text-sm text-slate-500 hover:text-slate-700 pb-1"}
                  onClick={() => setTab("text")}
                >
                  Plain text
                </button>
              </div>

              {tab === "html" ? (
                <iframe
                  title={`${active.name} HTML preview`}
                  srcDoc={active.html}
                  sandbox="allow-same-origin"
                  className="w-full border-0"
                  style={{ height: "600px" }}
                />
              ) : (
                <pre className="overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-6 text-slate-700 font-mono" style={{ minHeight: "200px" }}>
                  {active.text}
                </pre>
              )}
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center min-h-48">
            <p className="text-sm text-slate-500">Select a template from the list to preview it.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
