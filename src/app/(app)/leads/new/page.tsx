import { createLead } from "@/lib/actions";
import { getDemoContext } from "@/lib/app-context";
import { leadStatusOptions } from "@/lib/options";
import { Card, Field, inputClassName, PageHeader, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";

export default async function NewLeadPage() {
  const { users } = await getDemoContext();

  return (
    <>
      <PageHeader title="New lead" description="Capture the first call or referral and set the next follow-up before details get scattered." />

      <form action={createLead} className="grid gap-6">
        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Client</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name"><input name="firstName" required className={inputClassName} /></Field>
            <Field label="Last name"><input name="lastName" required className={inputClassName} /></Field>
            <Field label="Email"><input name="email" type="email" className={inputClassName} /></Field>
            <Field label="Phone"><input name="phone" className={inputClassName} /></Field>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Property and loss</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address"><input name="address1" required className={inputClassName} /></Field>
            <Field label="Apt, suite, or unit"><input name="address2" className={inputClassName} /></Field>
            <Field label="City"><input name="city" required className={inputClassName} /></Field>
            <Field label="State"><input name="state" required defaultValue="FL" className={inputClassName} /></Field>
            <Field label="ZIP"><input name="postalCode" required className={inputClassName} /></Field>
            <Field label="Loss type"><input name="lossType" required placeholder="Water damage, wind, fire..." className={inputClassName} /></Field>
            <Field label="Date of loss"><input name="dateOfLoss" type="date" className={inputClassName} /></Field>
            <Field label="Follow-up date"><input name="followUpDate" type="date" className={inputClassName} /></Field>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Intake</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Lead source"><input name="source" required placeholder="Referral, website, past client" className={inputClassName} /></Field>
            <Field label="Referral source"><input name="referralSource" className={inputClassName} /></Field>
            <Field label="Status">
              <select name="status" defaultValue="NEW" className={selectClassName}>
                {leadStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Assigned adjuster">
              <select name="assignedUserId" className={selectClassName} defaultValue={users[0]?.id}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes"><textarea name="notes" className={textareaClassName} /></Field>
        </Card>

        <div className="flex justify-end">
          <SubmitButton>Create lead</SubmitButton>
        </div>
      </form>
    </>
  );
}
