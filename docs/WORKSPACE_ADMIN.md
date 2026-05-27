# Workspace Admin

This guide explains how to create a real pilot workspace and owner user locally, without editing SQLite files by hand.

Use this for new pilot companies, for example:

- Workspace: Stark Loss
- Owner user: Steve Reardon

This workflow is additive and does not modify the seeded Harbor Public Adjusting demo workspace.

## Before Provisioning

Back up local data first:

```powershell
npm run backup:local
```

Treat the backup folder as sensitive local office data.

## Create A Workspace And Owner

Run:

```powershell
npm run admin:create-workspace -- --workspace-name "Stark Loss" --owner-name "Steve Reardon" --owner-email "steve@starkloss.example"
```

Required inputs:

- `--workspace-name`
- `--owner-name`
- `--owner-email`

Optional input:

- `--password`

Example with explicit password:

```powershell
npm run admin:create-workspace -- --workspace-name "Stark Loss" --owner-name "Steve Reardon" --owner-email "steve@starkloss.example" --password "ChooseAStrongPassword123!"
```

## Password Behavior

- If `--password` is provided, that password is hashed and stored.
- If `--password` is omitted, a temporary password is generated and printed once.
- Save the temporary password immediately and rotate it after first sign-in.

The script never stores cleartext passwords in files.

## Safety And Validation

The command:

- validates required inputs
- normalizes owner email to lowercase
- rejects duplicate owner email
- rejects duplicate workspace name
- creates the workspace and owner in one transaction
- assigns owner role as `OWNER` and active status `true`

If provisioning fails, no partial workspace or user is left behind.

## Test Login After Provisioning

1. Start the app:

```powershell
npm run start
```

2. Open `http://localhost:3000/login`.
3. Sign in with the new owner email and password.
4. Confirm the new owner lands in the new workspace and sees empty office data.
5. Create a lead or claim to confirm records save under the new workspace.
6. Sign out and sign in as a demo owner (for example `dana@harboradjusting.example`) to confirm demo data remains separate.

## Demo Reset Warning

Do not run demo reset after real pilot data exists in this database.

`npm run demo:reset:local -- -ConfirmReset` deletes all current data and reseeds demo-only data.

Use demo reset only on demo/training databases.
