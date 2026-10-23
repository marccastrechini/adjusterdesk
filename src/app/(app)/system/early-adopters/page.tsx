import { CopyInviteLink } from "@/components/copy-invite-link";
import { Badge, Card, Field, Notice, PageHeader, Section, SubmitButton, inputClassName } from "@/components/ui";
import { requireSystemAdminContext } from "@/lib/app-context";
import {
  copyEarlyAdopterInviteLinkAction,
  createEarlyAdopterInviteAction,
  dismissEarlyAdopterLinkReveal,
  readEarlyAdopterLinkReveal,
  resendEarlyAdopterInviteAction,
  revokeEarlyAdopterInviteAction,
} from "@/lib/early-adopter-actions";
import { listEarlyAdopterInvites } from "@/lib/early-adopter-db";
import { EARLY_ADOPTER_DEFAULT_EXPIRY_DAYS, earlyAdopterInviteStatus } from "@/lib/early-adopter";
import { formatDate } from "@/lib/format";
import { getNoticeMessage } from "@/lib/notices";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusTone(status: ReturnType<typeof earlyAdopterInviteStatus>) {
  if (status === "pending") return "teal" as const;
  if (status === "redeemed") return "green" as const;
  if (status === "expired") return "amber" as const;
  return "slate" as const;
}

export default async function EarlyAdoptersPage({ searchParams }: PageProps) {
  await requireSystemAdminContext();
  const query = await searchParams;
  const notice = getNoticeMessage(query);
  const error = firstValue(query.error);
  const invites = await listEarlyAdopterInvites();
  const revealedLink = await readEarlyAdopterLinkReveal();
  const now = new Date();
  const errorMessage =
    error === "email"
      ? "Enter a valid email address."
      : error === "expiry"
        ? "Expiry must be a whole number of days from 1 to 90."
        : error === "already-open"
          ? "That email already has a pending or expired invite. Resend or revoke it before creating another."
          : error === "resend" || error === "copy"
            ? "That invite cannot be reissued. Redeemed and revoked invites stay closed."
            : error === "revoke"
              ? "A redeemed invite cannot be revoked."
              : undefined;

  return (
    <>
      <PageHeader
        title="Early adopters"
        description="Send a single-use invite for a free office. No card and no Stripe checkout. The plan stays marked Early adopter until you change it on the workspace."
      />

      {notice ? <Notice title={notice.title}>{notice.message}</Notice> : null}
      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Invite not updated</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </Card>
      ) : null}
      {revealedLink ? (
        <Card className="grid gap-3 border-teal-200 bg-teal-50">
          <p className="font-semibold text-slate-950">Invite link</p>
          <p className="text-sm leading-6 text-slate-700">Shown for a few minutes. Refreshing this page keeps it until you dismiss it or it expires. It is not stored in the database.</p>
          <input readOnly value={revealedLink} className={inputClassName} />
          <div className="flex flex-wrap gap-2">
            <CopyInviteLink url={revealedLink} />
            <form action={dismissEarlyAdopterLinkReveal}>
              <SubmitButton variant="secondary">Dismiss link</SubmitButton>
            </form>
          </div>
        </Card>
      ) : null}

      <Section title="Send an invite" description={`Default expiry is ${EARLY_ADOPTER_DEFAULT_EXPIRY_DAYS} days. You can set 1 to 90 days for this invite.`}>
        <Card>
          <form action={createEarlyAdopterInviteAction} className="grid gap-4 md:grid-cols-2">
            <Field label="Email" required>
              <input name="email" type="email" required autoComplete="off" className={inputClassName} />
            </Field>
            <Field label="Name" hint="Optional. Used in the email greeting and the registration form.">
              <input name="name" autoComplete="off" className={inputClassName} />
            </Field>
            <Field label="Expires in days">
              <input name="expiresInDays" type="number" min={1} max={90} step={1} defaultValue={EARLY_ADOPTER_DEFAULT_EXPIRY_DAYS} className={inputClassName} />
            </Field>
            <Field label="Note" hint="Optional. Only visible here.">
              <input name="note" className={inputClassName} />
            </Field>
            <div className="md:col-span-2">
              <SubmitButton>Send invite</SubmitButton>
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Invites" description="Pending invites can be resent, revoked, or replaced with a link you copy yourself.">
        {invites.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">No early adopter invites yet.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {invites.map((invite) => {
              const status = earlyAdopterInviteStatus(invite, now);
              const canReissue = status === "pending" || status === "expired";
              return (
                <Card key={invite.id} className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{invite.email}</p>
                    <Badge tone={statusTone(status)}>{status}</Badge>
                  </div>
                  <div className="grid gap-1 text-sm leading-6 text-slate-700">
                    {invite.name ? <p>Name: {invite.name}</p> : null}
                    {invite.note ? <p>Note: {invite.note}</p> : null}
                    <p>Expires: {formatDate(invite.expiresAt)} ({invite.expiresInDays} days when issued)</p>
                    <p>Sent: {invite.lastSentAt ? formatDate(invite.lastSentAt) : "Not emailed yet"}</p>
                    {status === "redeemed" ? (
                      <p>
                        Redeemed {invite.redeemedAt ? formatDate(invite.redeemedAt) : ""}
                        {invite.redeemedBy ? ` by ${invite.redeemedBy.name} (${invite.redeemedBy.email})` : ""}
                        {invite.firm ? ` for ${invite.firm.name}` : ""}
                      </p>
                    ) : null}
                  </div>
                  {canReissue ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={resendEarlyAdopterInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <SubmitButton variant="secondary">Resend</SubmitButton>
                      </form>
                      <form action={copyEarlyAdopterInviteLinkAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <SubmitButton variant="secondary">Copy new link</SubmitButton>
                      </form>
                      <form action={revokeEarlyAdopterInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <SubmitButton variant="secondary">Revoke</SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
