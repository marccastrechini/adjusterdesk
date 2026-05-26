import { ActionForm, FieldError } from "@/components/action-form";
import { createClaimWithState } from "@/lib/actions";
import { getDemoContext } from "@/lib/app-context";
import { claimStatusOptions } from "@/lib/options";
import { Card, Field, inputClassName, PageHeader, selectClassName, SubmitButton, textareaClassName } from "@/components/ui";

export default async function NewClaimPage() {
  const { users } = await getDemoContext();

  return (
    <>
      <PageHeader title="New claim" description="Open a claim directly when the office already has the client and loss details." />

      <ActionForm action={createClaimWithState} className="grid gap-6">
        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Client</h2>
          <p className="text-sm leading-6 text-slate-600">Add the policyholder or main contact for the claim.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name" required><input name="firstName" required className={inputClassName} /><FieldError name="firstName" /></Field>
            <Field label="Last name" required><input name="lastName" required className={inputClassName} /><FieldError name="lastName" /></Field>
            <Field label="Email" hint="Optional. Useful for summaries and document requests."><input name="email" type="email" className={inputClassName} /></Field>
            <Field label="Phone" hint="Optional. Add the best call or text number when known."><input name="phone" className={inputClassName} /></Field>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Property</h2>
          <p className="text-sm leading-6 text-slate-600">Use the damaged property address, not the mailing address unless they are the same.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address" required><input name="address1" required className={inputClassName} /><FieldError name="address1" /></Field>
            <Field label="Apt, suite, or unit"><input name="address2" className={inputClassName} /></Field>
            <Field label="City" required><input name="city" required className={inputClassName} /><FieldError name="city" /></Field>
            <Field label="State" required><input name="state" required defaultValue="FL" className={inputClassName} /><FieldError name="state" /></Field>
            <Field label="ZIP" required><input name="postalCode" required className={inputClassName} /><FieldError name="postalCode" /></Field>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h2 className="text-base font-semibold text-slate-950">Claim details</h2>
          <p className="text-sm leading-6 text-slate-600">It is okay to save the claim before every carrier field is known. Use Next step to keep the next office action visible.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Carrier" hint="Optional. Add the carrier now or fill it in later."><input name="carrierName" className={inputClassName} /></Field>
            <Field label="Policy number" hint="Optional until the policy is collected."><input name="policyNumber" className={inputClassName} /></Field>
            <Field label="Carrier claim number" hint="Optional until the carrier assigns one."><input name="claimNumber" className={inputClassName} /></Field>
            <Field label="Loss type" required hint="Example: Water damage, wind / roof leak, fire smoke damage."><input name="lossType" required className={inputClassName} /><FieldError name="lossType" /></Field>
            <Field label="Date of loss" hint="Optional if still being confirmed."><input name="dateOfLoss" type="date" className={inputClassName} /></Field>
            <Field label="Reported date" hint="When the claim was reported to the carrier."><input name="reportedDate" type="date" className={inputClassName} /></Field>
            <Field label="Inspection date" hint="Leave blank until scheduled or completed."><input name="inspectionDate" type="date" className={inputClassName} /></Field>
            <Field label="Deadline" hint="Use the next known claim deadline or carrier follow-up date."><input name="deadlineDate" type="date" className={inputClassName} /></Field>
            <Field label="Status" hint="Choose the closest current claim stage.">
              <select name="status" defaultValue="NEW" className={selectClassName}>
                {claimStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Assigned adjuster" hint="Choose who owns the claim work right now.">
              <select name="assignedUserId" className={selectClassName} defaultValue={users[0]?.id}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Next step" hint="One plain action, like call carrier, request policy, schedule inspection, or send estimate."><input name="nextStep" className={inputClassName} /></Field>
          <Field label="Notes" hint="Add the short claim story, important contacts, or office reminders."><textarea name="notes" className={textareaClassName} /></Field>
        </Card>

        <div className="flex justify-end">
          <SubmitButton>Save claim and open overview</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
