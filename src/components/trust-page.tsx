export type TrustSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export function TrustPageContent({ sections }: { sections: TrustSection[] }) {
  return (
    <div className="grid gap-5">
      {sections.map((section) => (
        <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">{section.title}</h3>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm leading-6 text-slate-600">
              {paragraph}
            </p>
          ))}
          {section.items ? (
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 flex-none rounded-full bg-teal-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
