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
          <p className="text-sm leading-6 text-slate-600">Start with the person to call back. Email and phone are optional, but add at least one when the office has it.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name" required><input name="firstName" required className={inputClassName} /></Field>
            <Field label="Last name" required><input name="lastName" required className={inputClassName} /></Field>
            <Field label="Email" hint="Optional. Useful for sending intake notes or document requests."><input name="email" type="email" className={inputClassName} /></Field>
            <Field label="Phone" hint="Optional. Use the number the client prefers for calls or texts."><input name="phone" className={inputClassName} /></Field>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Property and loss</h2>
          <p className="text-sm leading-6 text-slate-600">Use the damaged property address and a plain loss type like water damage, roof leak, fire smoke, or hurricane damage.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address" required><input name="address1" required className={inputClassName} /></Field>
            <Field label="Apt, suite, or unit"><input name="address2" className={inputClassName} /></Field>
            <Field label="City" required><input name="city" required className={inputClassName} /></Field>
            <Field label="State" required><input name="state" required defaultValue="FL" className={inputClassName} /></Field>
            <Field label="ZIP" required><input name="postalCode" required className={inputClassName} /></Field>
            <Field label="Loss type" required hint="Keep it short and recognizable to the office."><input name="lossType" required placeholder="Water damage, wind, fire..." className={inputClassName} /></Field>
            <Field label="Date of loss" hint="Optional if the caller does not know yet."><input name="dateOfLoss" type="date" className={inputClassName} /></Field>
            <Field label="Follow-up date" hint="If you set this, AdjusterDesk also creates a follow-up task."><input name="followUpDate" type="date" className={inputClassName} /></Field>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Intake</h2>
          <p className="text-sm leading-6 text-slate-600">Capture where the lead came from, who owns the next touch, and any notes from the first conversation.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Lead source" required hint="Examples: Referral, website, past client, plumber."><input name="source" required placeholder="Referral, website, past client" className={inputClassName} /></Field>
            <Field label="Referral source" hint="Optional. Name the person or company when there is one."><input name="referralSource" className={inputClassName} /></Field>
            <Field label="Status" hint="Most new calls can stay New until the office reaches them.">
              <select name="status" defaultValue="NEW" className={selectClassName}>
                {leadStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Assigned adjuster" hint="Choose the person responsible for the next follow-up.">
              <select name="assignedUserId" className={selectClassName} defaultValue={users[0]?.id}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes" hint="Use plain office notes: damage summary, caller concerns, best callback time, and documents mentioned."><textarea name="notes" className={textareaClassName} /></Field>
        </Card>

        <div className="flex justify-end">
          <SubmitButton>Save lead and open detail</SubmitButton>
        </div>
      </form>
    </>
  );
}
