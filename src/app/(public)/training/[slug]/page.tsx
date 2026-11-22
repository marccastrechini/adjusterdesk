import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainingClose, TrainingWalkthrough } from "@/components/training-walkthrough";
import { PublicPageHeader, PublicSection } from "@/components/public-site";
import { publicPageMetadata } from "@/lib/public-metadata";
import { getAdjacentTrainingModules, getTrainingModule, trainingModulePath, trainingModules } from "@/lib/training";
import { brandName } from "@/lib/brand";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return trainingModules.map((trainingModule) => ({ slug: trainingModule.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const trainingModule = getTrainingModule(slug);
  if (!trainingModule) {
    return {};
  }

  return publicPageMetadata({
    title: `${trainingModule.title}: Public Adjuster CRM Training | ${brandName}`,
    description: trainingModule.summary,
    path: trainingModulePath(trainingModule.slug),
  });
}

export default async function TrainingModulePage({ params }: PageProps) {
  const { slug } = await params;
  const trainingModule = getTrainingModule(slug);
  if (!trainingModule) {
    notFound();
  }

  const { previous, next } = getAdjacentTrainingModules(trainingModule.slug);

  return (
    <>
      <PublicPageHeader eyebrow="Training" title={`${trainingModule.title} for public adjuster CRM`} description={trainingModule.summary} />
      <PublicSection
        title="Follow these steps"
        description="These screens are from Demo Office. The caption says what to look at on each one."
      >
        <TrainingWalkthrough trainingModule={trainingModule} previousModule={previous} nextModule={next} />
      </PublicSection>
      <TrainingClose />
    </>
  );
}
