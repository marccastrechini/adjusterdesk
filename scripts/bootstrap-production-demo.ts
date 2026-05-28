import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  ActivityType,
  ClaimStatus,
  ContactType,
  DocumentCategory,
  InvoiceStatus,
  LeadStatus,
  PrismaClient,
  SettlementStatus,
  TaskPriority,
  TaskStatus,
  TemplateType,
  UserRole,
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";
import { resolveAppBaseUrl, resolveDatabaseUrl, resolveUploadsDir } from "../src/lib/env";
import { generateClientStatusToken } from "../src/lib/status-links";

type CliOptions = {
  confirmProductionDemo: boolean;
  password?: string;
};

type FileDefinition = {
  relativePath: string;
  content: string;
};

type BootstrapCounts = {
  leads: number;
  convertedLeads: number;
  activeClaims: number;
  overdueTasks: number;
  dueTodayTasks: number;
  upcomingDeadlines: number;
  documents: number;
  requestedDocuments: number;
  clientStatusLinks: number;
  unpaidInvoices: number;
};

const demoWorkspaceName = "AdjusterDesk Demo Office";
const demoOwnerEmail = "demo.owner@adjusterdesk.xyz";
const demoOwnerName = "Demo Owner";
const demoAdjusterEmail = "demo.adjuster@adjusterdesk.xyz";
const demoAdjusterName = "Demo Adjuster";
const demoAssistantEmail = "demo.assistant@adjusterdesk.xyz";
const demoAssistantName = "Demo Assistant";
const demoPasswordEnvVar = "DEMO_OWNER_PASSWORD";
const expectedAppEnv = "production";
const expectedAppBaseUrl = "https://adjusterdesk.xyz";
const expectedDatabaseFragment = "production.db";
const expectedUploadsDir = "storage/uploads-production";
const demoUploadsFolder = "adjusterdesk-demo-office";

function daysFromNow(days: number, hour = 9) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { confirmProductionDemo: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "-ConfirmProductionDemo" || arg === "--ConfirmProductionDemo" || arg === "--confirm-production-demo") {
      options.confirmProductionDemo = true;
      continue;
    }

    if (arg === "--password" && next && !next.startsWith("-")) {
      options.password = next;
      index += 1;
    }
  }

  return options;
}

function loadEnvFile(filePath: string, overwrite = false) {
  const values: Record<string, string> = {};

  if (!existsSync(filePath)) {
    return values;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (overwrite || process.env[key] === undefined) {
      process.env[key] = value;
    }

    values[key] = value;
  }

  return values;
}

function loadProductionProfile() {
  const repoRoot = process.cwd();
  const sharedEnvPath = path.join(repoRoot, ".env");
  const productionEnvPath = path.join(repoRoot, ".env.production.local");

  loadEnvFile(sharedEnvPath, false);

  if (!existsSync(productionEnvPath)) {
    throw new Error(`Missing ${productionEnvPath}. Create the production profile before bootstrapping demo data.`);
  }

  loadEnvFile(productionEnvPath, true);

  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv !== expectedAppEnv) {
    throw new Error(`Refusing to run. APP_ENV must be ${expectedAppEnv}.`);
  }

  const appBaseUrl = resolveAppBaseUrl();
  if (appBaseUrl !== expectedAppBaseUrl) {
    throw new Error(`Refusing to run. APP_BASE_URL must be ${expectedAppBaseUrl}.`);
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl.includes(expectedDatabaseFragment)) {
    throw new Error("Refusing to run. DATABASE_URL must point to production.db.");
  }

  const uploadsDir = resolveUploadsDir();
  if (uploadsDir !== expectedUploadsDir) {
    throw new Error(`Refusing to run. UPLOADS_DIR must be ${expectedUploadsDir}.`);
  }

  return {
    repoRoot,
    sharedEnvPath,
    productionEnvPath,
    appBaseUrl,
    databaseUrl,
    uploadsDir,
  };
}

function requirePassword(rawOptions: CliOptions) {
  const runtimePassword = rawOptions.password ?? process.env[demoPasswordEnvVar]?.trim();

  if (!runtimePassword) {
    throw new Error(`Provide the demo owner password through ${demoPasswordEnvVar} or --password.`);
  }

  if (runtimePassword.length < 8) {
    throw new Error("The demo owner password must be at least 8 characters.");
  }

  return runtimePassword;
}

function storedUploadPath(uploadsDir: string, ...parts: string[]) {
  return path.posix.join(uploadsDir.replaceAll("\\", "/"), ...parts.map((part) => part.replaceAll("\\", "/")));
}

function writeDemoFile(baseUploadsDir: string, relativePath: string, content: string) {
  const absolutePath = path.join(baseUploadsDir, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${content.trim()}\n`, "utf8");
}

function ensureProductionBackup(repoRoot: string) {
  const backupScript = path.join(repoRoot, "scripts", "backup-local.ps1");
  execFileSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", backupScript, "-Profile", "production"], {
    stdio: "inherit",
  });
}

async function bootstrapDemoData(prisma: PrismaClient, config: ReturnType<typeof loadProductionProfile>, passwordHash: string) {
  const baseUploadsDir = path.join(config.repoRoot, config.uploadsDir);
  const demoUploadRoot = path.join(baseUploadsDir, demoUploadsFolder);
  rmSync(demoUploadRoot, { recursive: true, force: true });

  return prisma.$transaction(async (tx) => {
    let firm = await tx.firm.findFirst({
      where: { name: demoWorkspaceName },
      orderBy: { createdAt: "asc" },
    });

    if (!firm) {
      firm = await tx.firm.create({
        data: {
          name: demoWorkspaceName,
          phone: "(813) 555-0195",
          email: "office@adjusterdesk.xyz",
        },
      });
    }

    await tx.payment.deleteMany({ where: { firmId: firm.id } });
    await tx.invoice.deleteMany({ where: { firmId: firm.id } });
    await tx.settlementRound.deleteMany({ where: { firmId: firm.id } });
    await tx.clientStatusLink.deleteMany({ where: { firmId: firm.id } });
    await tx.document.deleteMany({ where: { firmId: firm.id } });
    await tx.activity.deleteMany({ where: { firmId: firm.id } });
    await tx.task.deleteMany({ where: { firmId: firm.id } });
    await tx.claim.deleteMany({ where: { firmId: firm.id } });
    await tx.lead.deleteMany({ where: { firmId: firm.id } });
    await tx.policy.deleteMany({ where: { firmId: firm.id } });
    await tx.carrier.deleteMany({ where: { firmId: firm.id } });
    await tx.property.deleteMany({ where: { firmId: firm.id } });
    await tx.contact.deleteMany({ where: { firmId: firm.id } });
    await tx.feeRule.deleteMany({ where: { firmId: firm.id } });
    await tx.template.deleteMany({ where: { firmId: firm.id } });
    await tx.user.deleteMany({
      where: {
        firmId: firm.id,
        email: { notIn: [demoOwnerEmail, demoAdjusterEmail, demoAssistantEmail] },
      },
    });

    const owner = await tx.user.upsert({
      where: { email: demoOwnerEmail },
      create: {
        firmId: firm.id,
        name: demoOwnerName,
        email: demoOwnerEmail,
        passwordHash,
        role: UserRole.OWNER,
        isSystemAdmin: false,
        active: true,
      },
      update: {
        firmId: firm.id,
        name: demoOwnerName,
        passwordHash,
        role: UserRole.OWNER,
        isSystemAdmin: false,
        active: true,
      },
    });

    await tx.passwordResetToken.deleteMany({ where: { userId: owner.id } });
    await tx.userInvitationToken.deleteMany({ where: { userId: owner.id } });

    const adjuster = await tx.user.upsert({
      where: { email: demoAdjusterEmail },
      create: {
        firmId: firm.id,
        name: demoAdjusterName,
        email: demoAdjusterEmail,
        passwordHash,
        role: UserRole.ADJUSTER,
        isSystemAdmin: false,
        active: true,
      },
      update: {
        firmId: firm.id,
        name: demoAdjusterName,
        passwordHash,
        role: UserRole.ADJUSTER,
        isSystemAdmin: false,
        active: true,
      },
    });

    const assistant = await tx.user.upsert({
      where: { email: demoAssistantEmail },
      create: {
        firmId: firm.id,
        name: demoAssistantName,
        email: demoAssistantEmail,
        passwordHash,
        role: UserRole.ASSISTANT,
        isSystemAdmin: false,
        active: true,
      },
      update: {
        firmId: firm.id,
        name: demoAssistantName,
        passwordHash,
        role: UserRole.ASSISTANT,
        isSystemAdmin: false,
        active: true,
      },
    });

    const carriers = {
      bayline: await tx.carrier.create({
        data: {
          firmId: firm.id,
          name: "Bayline Insurance",
          phone: "(800) 555-0108",
          email: "claims@bayline.example",
        },
      }),
      summit: await tx.carrier.create({
        data: {
          firmId: firm.id,
          name: "Summit Property Insurance",
          phone: "(800) 555-0119",
          email: "desk@summitproperty.example",
        },
      }),
      harbor: await tx.carrier.create({
        data: {
          firmId: firm.id,
          name: "Harbor State Mutual",
          phone: "(800) 555-0144",
          email: "claims@harborstate.example",
        },
      }),
    };

    const feeRule = await tx.feeRule.create({
      data: {
        firmId: firm.id,
        name: "Demo fee rule",
        percentageBasisPoints: 1000,
        appliesTo: "Accepted settlement",
        active: true,
      },
    });

    const leadOneContact = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Riley",
        lastName: "Bennett",
        email: "riley.bennett@example.com",
        phone: "(813) 555-0101",
        notes: "Ready to convert after the signed paperwork is reviewed.",
      },
    });

    const leadTwoContact = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Monica",
        lastName: "Alvarez",
        email: "monica.alvarez@example.com",
        phone: "(727) 555-0122",
      },
    });

    const leadThreeContact = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Troy",
        lastName: "Whitman",
        email: "troy.whitman@example.com",
        phone: "(941) 555-0147",
      },
    });

    const claimOneContact = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Nora",
        lastName: "James",
        email: "nora.james@example.com",
        phone: "(727) 555-0182",
      },
    });

    const claimTwoContact = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Evan",
        lastName: "Brooks",
        email: "evan.brooks@example.com",
        phone: "(813) 555-0159",
      },
    });

    const leadOneProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "114 Cypress Bend Drive",
        city: "Tampa",
        state: "FL",
        postalCode: "33602",
        notes: "Small kitchen water loss with cabinet swelling.",
      },
    });

    const leadTwoProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "281 Seabreeze Avenue",
        city: "St. Petersburg",
        state: "FL",
        postalCode: "33704",
        notes: "Roof leak after a recent storm.",
      },
    });

    const leadThreeProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "9 Pelican Key Road",
        city: "Clearwater",
        state: "FL",
        postalCode: "33756",
        notes: "Smoke cleanup follow-up needed.",
      },
    });

    const claimOneProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "52 Garden Isle Loop",
        city: "Largo",
        state: "FL",
        postalCode: "33770",
        notes: "Interior water damage and cabinet replacement story claim.",
      },
    });

    const claimTwoProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "417 Harbor Crest Drive",
        city: "Seminole",
        state: "FL",
        postalCode: "33772",
        notes: "Wind damage claim waiting on carrier review.",
      },
    });

    const leadOne = await tx.lead.create({
      data: {
        firmId: firm.id,
        contactId: leadOneContact.id,
        propertyId: leadOneProperty.id,
        assignedUserId: owner.id,
        source: "Website",
        referralSource: "Search engine",
        lossType: "Water damage",
        dateOfLoss: daysFromNow(-3),
        status: LeadStatus.APPOINTMENT_SET,
        followUpDate: daysFromNow(0, 10),
        notes: "Ready for a same-day follow-up and likely conversion after the agreement call.",
      },
    });

    const leadTwo = await tx.lead.create({
      data: {
        firmId: firm.id,
        contactId: leadTwoContact.id,
        propertyId: leadTwoProperty.id,
        assignedUserId: adjuster.id,
        source: "Referral",
        referralSource: "Bayline Roofing",
        lossType: "Wind damage",
        dateOfLoss: daysFromNow(-11),
        status: LeadStatus.CONVERTED,
        followUpDate: daysFromNow(-1, 11),
        notes: "Converted to an active claim for the production demo.",
      },
    });

    const leadThree = await tx.lead.create({
      data: {
        firmId: firm.id,
        contactId: leadThreeContact.id,
        propertyId: leadThreeProperty.id,
        assignedUserId: assistant.id,
        source: "Phone",
        referralSource: "Past client",
        lossType: "Fire smoke damage",
        dateOfLoss: daysFromNow(-5),
        status: LeadStatus.NEW,
        followUpDate: daysFromNow(-1, 14),
        notes: "New lead with an overdue follow-up after initial intake photos came in.",
      },
    });

    const claimOne = await tx.claim.create({
      data: {
        firmId: firm.id,
        contactId: leadTwoContact.id,
        propertyId: claimOneProperty.id,
        carrierId: carriers.bayline.id,
        leadId: leadTwo.id,
        assignedUserId: adjuster.id,
        claimNumber: "BAY-25-0410",
        lossType: "Wind damage",
        dateOfLoss: daysFromNow(-11),
        reportedDate: daysFromNow(-10),
        inspectionDate: daysFromNow(-6),
        deadlineDate: daysFromNow(12),
        status: ClaimStatus.NEGOTIATING,
        nextStep: "Confirm the final settlement check and release the fee invoice.",
        publicSummary: "Negotiating the final settlement amount after the carrier review.",
        notes: "Converted lead with a settlement check posted and fee collection in progress.",
      },
    });

    const claimTwo = await tx.claim.create({
      data: {
        firmId: firm.id,
        contactId: claimOneContact.id,
        propertyId: claimTwoProperty.id,
        carrierId: carriers.summit.id,
        assignedUserId: owner.id,
        claimNumber: "SUM-25-0204",
        lossType: "Water damage",
        dateOfLoss: daysFromNow(-8),
        reportedDate: daysFromNow(-7),
        inspectionDate: daysFromNow(-4),
        deadlineDate: daysFromNow(6),
        status: ClaimStatus.WAITING_ON_CLIENT,
        nextStep: "Collect the remaining kitchen and hallway photos from the client.",
        publicSummary: "Waiting on the client to finish sending requested interior photo proof.",
        notes: "One photo packet arrived, but key room angles are still missing for review.",
      },
    });

    const claimThree = await tx.claim.create({
      data: {
        firmId: firm.id,
        contactId: claimTwoContact.id,
        propertyId: leadThreeProperty.id,
        carrierId: carriers.harbor.id,
        assignedUserId: assistant.id,
        claimNumber: "HSM-25-0221",
        lossType: "Fire smoke damage",
        dateOfLoss: daysFromNow(-19),
        reportedDate: daysFromNow(-18),
        inspectionDate: daysFromNow(-13),
        deadlineDate: daysFromNow(22),
        status: ClaimStatus.WAITING_ON_CARRIER,
        nextStep: "Call the carrier desk and lock in the supplement review date.",
        publicSummary: "Carrier follow-up is pending while the supplement is in review.",
        notes: "Desk follow-up is active and waiting on the assigned examiner callback.",
      },
    });

    await tx.lead.update({
      where: { id: leadTwo.id },
      data: { convertedClaimId: claimOne.id },
    });

    const statusToken = generateClientStatusToken();
    await tx.clientStatusLink.create({
      data: {
        firmId: firm.id,
        claimId: claimOne.id,
        token: statusToken,
        isActive: true,
      },
    });

    await tx.task.createMany({
      data: [
        {
          firmId: firm.id,
          leadId: leadOne.id,
          assignedUserId: owner.id,
          title: "Call Riley about the signed agreement",
          notes: "This ready-to-convert lead should move to a claim after the call.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.HIGH,
          dueDate: daysFromNow(0, 9),
        },
        {
          firmId: firm.id,
          claimId: claimOne.id,
          assignedUserId: adjuster.id,
          title: "Call carrier about the final settlement check",
          notes: "Confirm whether the fee invoice can be released this week.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.HIGH,
          dueDate: daysFromNow(-1, 11),
        },
        {
          firmId: firm.id,
          claimId: claimOne.id,
          assignedUserId: assistant.id,
          title: "Review photos and update claim notes",
          status: TaskStatus.OPEN,
          priority: TaskPriority.NORMAL,
          dueDate: daysFromNow(0, 14),
        },
        {
          firmId: firm.id,
          claimId: claimTwo.id,
          assignedUserId: owner.id,
          title: "Prepare missing interior photo reminder",
          notes: "Send one more reminder before the client follow-up call.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.NORMAL,
          dueDate: daysFromNow(4, 10),
        },
        {
          firmId: firm.id,
          claimId: claimThree.id,
          assignedUserId: assistant.id,
          title: "Call carrier desk for review date",
          notes: "Confirm who owns the review and request a target response date.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.NORMAL,
          dueDate: daysFromNow(0, 13),
        },
      ],
    });

    const documentFiles: FileDefinition[] = [];
    const claimOnePolicyPath = storedUploadPath(config.uploadsDir, demoUploadsFolder, "claims", claimOne.id, "policy-declarations.txt");
    const claimOnePhotosPath = storedUploadPath(config.uploadsDir, demoUploadsFolder, "claims", claimOne.id, "demo-loss-photos.txt");
    const claimTwoReceivedPhotosPath = storedUploadPath(config.uploadsDir, demoUploadsFolder, "claims", claimTwo.id, "client-hallway-photos.txt");
    const claimThreeCarrierPacketPath = storedUploadPath(config.uploadsDir, demoUploadsFolder, "claims", claimThree.id, "carrier-supplement-packet.txt");
    const claimOnePolicyContent = ["AdjusterDesk Demo Office", "Fake policy declarations for the demo claim."].join("\n");
    const claimOnePhotosContent = ["AdjusterDesk Demo Office", "Fake photo notes for the demo claim."].join("\n");
    const claimTwoReceivedPhotosContent = ["AdjusterDesk Demo Office", "Client uploaded hallway and ceiling photo notes for claim review."].join("\n");
    const claimThreeCarrierPacketContent = ["AdjusterDesk Demo Office", "Carrier supplement packet summary and line-item review notes."].join("\n");

    documentFiles.push({ relativePath: claimOnePolicyPath, content: claimOnePolicyContent });
    documentFiles.push({ relativePath: claimOnePhotosPath, content: claimOnePhotosContent });
    documentFiles.push({ relativePath: claimTwoReceivedPhotosPath, content: claimTwoReceivedPhotosContent });
    documentFiles.push({ relativePath: claimThreeCarrierPacketPath, content: claimThreeCarrierPacketContent });

    await tx.document.createMany({
      data: [
        {
          firmId: firm.id,
          claimId: claimOne.id,
          uploadedByUserId: assistant.id,
          category: DocumentCategory.POLICY,
          title: "Policy declarations",
          notes: "Carrier declarations page received and checked against policy dates.",
          fileName: "policy-declarations.txt",
          filePath: claimOnePolicyPath,
          mimeType: "text/plain",
          sizeBytes: Buffer.byteLength(claimOnePolicyContent, "utf8"),
          receivedAt: daysFromNow(-10),
        },
        {
          firmId: firm.id,
          claimId: claimOne.id,
          uploadedByUserId: owner.id,
          category: DocumentCategory.PHOTOS,
          title: "Demo loss photos",
          notes: "Initial interior and exterior loss photos uploaded to support estimate review.",
          fileName: "demo-loss-photos.txt",
          filePath: claimOnePhotosPath,
          mimeType: "text/plain",
          sizeBytes: Buffer.byteLength(claimOnePhotosContent, "utf8"),
          receivedAt: daysFromNow(-8),
        },
        {
          firmId: firm.id,
          claimId: claimTwo.id,
          category: DocumentCategory.OTHER,
          title: "Request interior ceiling photos",
          notes: "Requested from client. Still missing kitchen ceiling angles needed for final estimate support.",
          requestedFromClient: true,
        },
        {
          firmId: firm.id,
          claimId: claimTwo.id,
          uploadedByUserId: owner.id,
          category: DocumentCategory.PHOTOS,
          title: "Client hallway photo upload",
          notes: "Received from client. Hallway and entry photos are in; kitchen set is still pending.",
          fileName: "client-hallway-photos.txt",
          filePath: claimTwoReceivedPhotosPath,
          mimeType: "text/plain",
          sizeBytes: Buffer.byteLength(claimTwoReceivedPhotosContent, "utf8"),
          receivedAt: daysFromNow(-1, 13),
        },
        {
          firmId: firm.id,
          claimId: claimThree.id,
          category: DocumentCategory.OTHER,
          title: "Request smoke cleanup estimate",
          notes: "Requested from client. Waiting for contractor estimate and final smoke cleanup invoice.",
          requestedFromClient: true,
        },
        {
          firmId: firm.id,
          claimId: claimThree.id,
          uploadedByUserId: assistant.id,
          category: DocumentCategory.CARRIER_CORRESPONDENCE,
          title: "Carrier supplement packet",
          notes: "Received from carrier desk. Waiting on assigned examiner to confirm review completion date.",
          fileName: "carrier-supplement-packet.txt",
          filePath: claimThreeCarrierPacketPath,
          mimeType: "text/plain",
          sizeBytes: Buffer.byteLength(claimThreeCarrierPacketContent, "utf8"),
          receivedAt: daysFromNow(-2, 16),
        },
      ],
    });

    await tx.activity.createMany({
      data: [
        {
          firmId: firm.id,
          leadId: leadOne.id,
          contactId: leadOneContact.id,
          userId: owner.id,
          type: ActivityType.CALL,
          subject: "Intro call complete",
          body: "Reviewed the intake details, explained next documents, and confirmed a same-day conversion call window.",
          occurredAt: daysFromNow(-1, 15),
        },
        {
          firmId: firm.id,
          leadId: leadThree.id,
          contactId: leadThreeContact.id,
          userId: assistant.id,
          type: ActivityType.TEXT,
          subject: "Overdue lead follow-up text",
          body: "Sent a quick text check-in and requested preferred callback time to keep intake moving.",
          occurredAt: daysFromNow(-1, 16),
        },
        {
          firmId: firm.id,
          claimId: claimOne.id,
          contactId: leadTwoContact.id,
          userId: adjuster.id,
          type: ActivityType.INSPECTION,
          subject: "Inspection reviewed",
          body: "Carrier photos and estimate notes are ready for negotiation.",
          occurredAt: daysFromNow(-6, 10),
        },
        {
          firmId: firm.id,
          claimId: claimOne.id,
          contactId: leadTwoContact.id,
          userId: adjuster.id,
          type: ActivityType.EMAIL,
          subject: "Client follow-up starter used",
          body: "Template starter used: Hi Monica, quick claim follow-up from our office. We posted your settlement check and will update you when the fee balance is fully received.",
          occurredAt: daysFromNow(-1, 9),
        },
        {
          firmId: firm.id,
          claimId: claimTwo.id,
          contactId: claimOneContact.id,
          userId: owner.id,
          type: ActivityType.EMAIL,
          subject: "Missing photos requested",
          body: "Template starter used: quick reminder that we still need the kitchen and hallway interior photos to finalize review.",
          occurredAt: daysFromNow(-2, 9),
        },
        {
          firmId: firm.id,
          claimId: claimThree.id,
          contactId: claimTwoContact.id,
          userId: assistant.id,
          type: ActivityType.CALL,
          subject: "Carrier desk follow-up call",
          body: "Spoke with the desk and requested a target date for supplement review completion.",
          occurredAt: daysFromNow(-1, 11),
        },
        {
          firmId: firm.id,
          claimId: claimThree.id,
          contactId: claimTwoContact.id,
          userId: assistant.id,
          type: ActivityType.EMAIL,
          subject: "Carrier follow-up starter used",
          body: "Template starter used: following up on claim HSM-DEMO-0221 and requesting the current supplement review status.",
          occurredAt: daysFromNow(0, 8),
        },
      ],
    });

    await tx.template.createMany({
      data: [
        {
          firmId: firm.id,
          name: "Client follow-up",
          type: TemplateType.EMAIL,
          subject: "Quick claim follow-up",
          body: "Hi {{client_name}},\n\nQuick follow-up on your claim file. We are still working through the current items and wanted to confirm if you had any updates or questions today.\n\nThank you,\n{{adjuster_name}}",
        },
        {
          firmId: firm.id,
          name: "Carrier follow-up",
          type: TemplateType.EMAIL,
          subject: "Claim status follow-up",
          body: "Hello,\n\nFollowing up on claim {{claim_number}} for {{client_name}}. Please share the current status and any items needed from our office to keep review moving.\n\nThank you,\n{{adjuster_name}}",
        },
        {
          firmId: firm.id,
          name: "Inspection scheduled",
          type: TemplateType.TEXT,
          subject: "Inspection scheduled",
          body: "Inspection is scheduled for {{inspection_date}} at {{inspection_time}}. Please reply if anything changes and keep the damaged areas accessible.",
        },
        {
          firmId: firm.id,
          name: "Missing documents reminder",
          type: TemplateType.TEXT,
          subject: "Missing documents reminder",
          body: "Quick reminder: we still need the requested claim documents to keep your file moving. Please send them when ready, and we will confirm receipt.",
        },
        {
          firmId: firm.id,
          name: "Settlement update",
          type: TemplateType.LETTER,
          subject: "Settlement update",
          body: "This is an update on your claim settlement. We have logged the latest carrier response and will contact you with the next recommended step after final review.",
        },
      ],
    });

    await tx.settlementRound.createMany({
      data: [
        {
          firmId: firm.id,
          claimId: claimOne.id,
          roundNumber: 1,
          demandAmountCents: 4250000,
          offerAmountCents: 3800000,
          acceptedAmountCents: 3800000,
          status: SettlementStatus.ACCEPTED,
          offeredAt: daysFromNow(-2, 11),
          notes: "Accepted settlement after the final estimate review.",
        },
        {
          firmId: firm.id,
          claimId: claimThree.id,
          roundNumber: 1,
          demandAmountCents: 2980000,
          offerAmountCents: 0,
          status: SettlementStatus.OFFER_RECEIVED,
          offeredAt: daysFromNow(-3, 14),
          notes: "Awaiting the first carrier offer on the smoke loss.",
        },
      ],
    });

    await tx.invoice.create({
      data: {
        firmId: firm.id,
        claimId: claimOne.id,
        feeRuleId: feeRule.id,
        invoiceNumber: "AD-DEMO-1001",
        status: InvoiceStatus.OVERDUE,
        settlementAmountCents: 3800000,
        feePercentageBasisPoints: 1000,
        feeAmountCents: 380000,
        amountPaidCents: 0,
        issuedAt: daysFromNow(-6, 9),
        dueAt: daysFromNow(-1, 17),
        notes: "Demo fee invoice tied to the accepted settlement.",
      },
    });

    const partialInvoice = await tx.invoice.create({
      data: {
        firmId: firm.id,
        claimId: claimThree.id,
        feeRuleId: feeRule.id,
        invoiceNumber: "AD-DEMO-1002",
        status: InvoiceStatus.PARTIALLY_PAID,
        settlementAmountCents: 2100000,
        feePercentageBasisPoints: 1000,
        feeAmountCents: 210000,
        amountPaidCents: 60000,
        issuedAt: daysFromNow(-3, 10),
        dueAt: daysFromNow(5, 17),
        notes: "Partial fee payment received while the supplement review is still active.",
      },
    });

    await tx.payment.create({
      data: {
        firmId: firm.id,
        claimId: claimOne.id,
        invoiceId: null,
        amountCents: 3800000,
        paidAt: daysFromNow(-2, 12),
        checkNumber: "DEMO-1084",
        payee: "AdjusterDesk Demo Office",
        notes: "Settlement check recorded for the demo claim.",
      },
    });

    await tx.payment.create({
      data: {
        firmId: firm.id,
        claimId: claimThree.id,
        invoiceId: partialInvoice.id,
        amountCents: 60000,
        paidAt: daysFromNow(-1, 15),
        checkNumber: "DEMO-1120",
        payee: "AdjusterDesk Demo Office",
        notes: "Partial fee payment logged while waiting on final carrier supplement review.",
      },
    });

    return {
      firm,
      owner,
      files: documentFiles,
    };
  });
}

async function main() {
  const rawOptions = parseArgs(process.argv.slice(2));

  if (!rawOptions.confirmProductionDemo) {
    throw new Error("Refusing to run. Re-run with -ConfirmProductionDemo.");
  }

  const config = loadProductionProfile();
  const runtimePassword = requirePassword(rawOptions);
  const passwordHash = hashPassword(runtimePassword);
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: config.databaseUrl }),
  });

  try {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@adjusterdesk.xyz" },
      select: { email: true, isSystemAdmin: true },
    });

    if (!admin || !admin.isSystemAdmin) {
      throw new Error("System admin admin@adjusterdesk.xyz is missing or no longer marked as system admin.");
    }

    console.log("System admin verified: admin@adjusterdesk.xyz remains system admin.");
    console.log(`Public URL: ${config.appBaseUrl}`);
    console.log(`Production database: ${config.databaseUrl}`);
    console.log(`Production uploads: ${config.uploadsDir}`);

    ensureProductionBackup(config.repoRoot);

    const result = await bootstrapDemoData(prisma, config, passwordHash);
    const baseUploadsDir = path.join(config.repoRoot, config.uploadsDir);

    for (const file of result.files) {
      writeDemoFile(baseUploadsDir, file.relativePath.replace(`${config.uploadsDir.replaceAll("\\", "/")}/`, ""), file.content);
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    const upcomingDeadlineEnd = new Date(todayStart);
    upcomingDeadlineEnd.setDate(todayStart.getDate() + 30);

    const [leadCount, convertedLeadCount, activeClaimCount, overdueTaskCount, dueTodayTaskCount, upcomingDeadlineCount, documentCount, requestedDocumentCount, clientStatusLinkCount, unpaidInvoiceCount] =
      await Promise.all([
        prisma.lead.count({ where: { firmId: result.firm.id } }),
        prisma.lead.count({ where: { firmId: result.firm.id, convertedClaimId: { not: null } } }),
        prisma.claim.count({
          where: {
            firmId: result.firm.id,
            status: { notIn: [ClaimStatus.CLOSED, ClaimStatus.SETTLED] },
          },
        }),
        prisma.task.count({
          where: { firmId: result.firm.id, status: TaskStatus.OPEN, dueDate: { lt: todayStart } },
        }),
        prisma.task.count({
          where: { firmId: result.firm.id, status: TaskStatus.OPEN, dueDate: { gte: todayStart, lt: tomorrowStart } },
        }),
        prisma.claim.count({
          where: { firmId: result.firm.id, deadlineDate: { gte: todayStart, lte: upcomingDeadlineEnd } },
        }),
        prisma.document.count({ where: { firmId: result.firm.id } }),
        prisma.document.count({ where: { firmId: result.firm.id, requestedFromClient: true } }),
        prisma.clientStatusLink.count({ where: { firmId: result.firm.id } }),
        prisma.invoice.count({
          where: {
            firmId: result.firm.id,
            status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
          },
        }),
      ]);

    const summary: BootstrapCounts = {
      leads: leadCount,
      convertedLeads: convertedLeadCount,
      activeClaims: activeClaimCount,
      overdueTasks: overdueTaskCount,
      dueTodayTasks: dueTodayTaskCount,
      upcomingDeadlines: upcomingDeadlineCount,
      documents: documentCount,
      requestedDocuments: requestedDocumentCount,
      clientStatusLinks: clientStatusLinkCount,
      unpaidInvoices: unpaidInvoiceCount,
    };

    console.log("Production demo bootstrap complete.");
    console.log(`Workspace: ${result.firm.name}`);
    console.log(`Owner: ${demoOwnerEmail}`);
    console.log(`Owner role: ${result.owner.role}`);
    console.log(`Owner active: ${result.owner.active ? "true" : "false"}`);
    console.log(`Owner system admin: ${result.owner.isSystemAdmin ? "true" : "false"}`);
    console.log(`Record counts: ${JSON.stringify(summary)}`);
    console.log(`Production database path: ${config.databaseUrl}`);
    console.log(`Uploads path: ${config.uploadsDir}`);
    console.log(`Public URL: ${config.appBaseUrl}`);
    console.log("Password source: runtime env or CLI flag (value not printed).");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown bootstrap error.";
  console.error(`Production demo bootstrap failed: ${message}`);
  console.error("Usage:");
  console.error("  npm run prod:demo:bootstrap -- -ConfirmProductionDemo");
  console.error(`  $env:${demoPasswordEnvVar} = \"<password>\"`);
  console.error("  npm run prod:demo:bootstrap -- -ConfirmProductionDemo --password \"<password>\"");
  process.exit(1);
});