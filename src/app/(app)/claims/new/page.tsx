import { createClaim } from "@/lib/actions";
import { getDemoContext } from "@/lib/app-context";
import { claimStatusOptions } from "@/lib/options";
import { Card, Field, inputClassName, PageHeader, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";

export default async function NewClaimPage() {
  const { users } = await getDemoContext();

  return (
    <>
      <PageHeader title="New claim" description="Open a claim directly when the office already has the client and loss details." />

      <form action={createClaim} className="grid gap-6">
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
          <h2 className="text-base font-semibold text-slate-950">Property</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address"><input name="address1" required className={inputClassName} /></Field>
            <Field label="Apt, suite, or unit"><input name="address2" className={inputClassName} /></Field>
            <Field label="City"><input name="city" required className={inputClassName} /></Field>
            <Field label="State"><input name="state" required defaultValue="FL" className={inputClassName} /></Field>
            <Field label="ZIP"><input name="postalCode" required className={inputClassName} /></Field>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Claim details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Carrier"><input name="carrierName" className={inputClassName} /></Field>
            <Field label="Policy number"><input name="policyNumber" className={inputClassName} /></Field>
            <Field label="Carrier claim number"><input name="claimNumber" className={inputClassName} /></Field>
            <Field label="Loss type"><input name="lossType" required className={inputClassName} /></Field>
            <Field label="Date of loss"><input name="dateOfLoss" type="date" className={inputClassName} /></Field>
            <Field label="Reported date"><input name="reportedDate" type="date" className={inputClassName} /></Field>
            <Field label="Inspection date"><input name="inspectionDate" type="date" className={inputClassName} /></Field>
            <Field label="Deadline"><input name="deadlineDate" type="date" className={inputClassName} /></Field>
            <Field label="Status">
              <select name="status" defaultValue="NEW" className={selectClassName}>
                {claimStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Assigned adjuster">
              <select name="assignedUserId" className={selectClassName} defaultValue={users[0]?.id}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Next step"><input name="nextStep" className={inputClassName} /></Field>
          <Field label="Notes"><textarea name="notes" className={textareaClassName} /></Field>
        </Card>

        <div className="flex justify-end">
          <SubmitButton>Create claim</SubmitButton>
        </div>
      </form>
    </>
  );
}
