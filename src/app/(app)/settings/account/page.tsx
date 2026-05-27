import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, Notice, PageHeader, Section } from "@/components/ui";
import { getNoticeMessage } from "@/lib/notices";
import { getDemoContext } from "@/lib/app-context";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountSettingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const { user } = await getDemoContext();

  return (
    <>
      <PageHeader title="Account security" description="Change your own sign-in password for this office account." />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}

      <Section title="Password">
        <Card className="grid gap-4 md:max-w-xl">
          <div className="text-sm leading-6 text-slate-700">
            <p>Signed in as {user.name} ({user.email}).</p>
            <p className="mt-1">This page only changes your own password. System-admin reset tools stay separate.</p>
          </div>
          <ChangePasswordForm />
        </Card>
      </Section>
    </>
  );
}
