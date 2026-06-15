import { requireSystemAdminContext } from "@/lib/app-context";
import { getSystemEmailTemplates } from "@/lib/system-email-templates";
import { SystemEmailPreviewPanel } from "@/components/system-email-preview-panel";
import { ButtonLink, PageHeader } from "@/components/ui";

export default async function SystemEmailsPage() {
  await requireSystemAdminContext();

  const templates = getSystemEmailTemplates();

  return (
    <>
      <PageHeader
        title="System emails"
        description="Preview system email templates using sample data. This page does not send email."
        actions={<ButtonLink href="/system">System dashboard</ButtonLink>}
      />

      <SystemEmailPreviewPanel templates={templates} />
    </>
  );
}
