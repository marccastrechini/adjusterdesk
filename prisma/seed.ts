import "dotenv/config";
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
import { assertDemoSeedTarget } from "../src/lib/demo-safety";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

function daysFromNow(days: number, hour = 9) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0);
}

function cents(amount: number) {
  return Math.round(amount * 100);
}

const seededDevPassword = "AdjusterDeskDemo123!";

async function main() {
  assertDemoSeedTarget({
    appEnv: process.env.APP_ENV,
    databaseUrl: process.env.DATABASE_URL,
  });

  const demoPasswordHash = hashPassword(seededDevPassword);

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany();
    await tx.invoice.deleteMany();
    await tx.settlementRound.deleteMany();
    await tx.feedbackEntry.deleteMany();
    await tx.clientStatusLink.deleteMany();
    await tx.document.deleteMany();
    await tx.activity.deleteMany();
    await tx.task.deleteMany();
    await tx.claim.deleteMany();
    await tx.lead.deleteMany();
    await tx.policy.deleteMany();
    await tx.carrier.deleteMany();
    await tx.property.deleteMany();
    await tx.contact.deleteMany();
    await tx.template.deleteMany();
    await tx.feeRule.deleteMany();
    await tx.user.deleteMany();
    await tx.firm.deleteMany();

    const firm = await tx.firm.create({
      data: {
        name: "Harbor Public Adjusting",
        phone: "(813) 555-0188",
        email: "office@harboradjusting.example",
      },
    });

    const owner = await tx.user.create({
      data: {
        firmId: firm.id,
        name: "Dana Morris",
        email: "dana@harboradjusting.example",
        passwordHash: demoPasswordHash,
        role: UserRole.OWNER,
        isSystemAdmin: true,
      },
    });

    const adjuster = await tx.user.create({
      data: {
        firmId: firm.id,
        name: "Luis Patel",
        email: "luis@harboradjusting.example",
        passwordHash: demoPasswordHash,
        role: UserRole.ADJUSTER,
      },
    });

    const assistant = await tx.user.create({
      data: {
        firmId: firm.id,
        name: "Kim Brooks",
        email: "kim@harboradjusting.example",
        passwordHash: demoPasswordHash,
        role: UserRole.ASSISTANT,
      },
    });

    await tx.user.create({
      data: {
        firmId: firm.id,
        name: "Avery Chen",
        email: "avery@harboradjusting.example",
        passwordHash: demoPasswordHash,
        role: UserRole.ASSISTANT,
        active: false,
      },
    });

    const gulfCoast = await tx.carrier.create({
      data: {
        firmId: firm.id,
        name: "Gulf Coast Mutual",
        phone: "(800) 555-0142",
        email: "claims@gulfcoast.example",
        portalUrl: "https://carrier.example/gulf-coast",
      },
    });

    const sunState = await tx.carrier.create({
      data: {
        firmId: firm.id,
        name: "Sun State Insurance",
        phone: "(888) 555-0155",
        email: "desk@sunstate.example",
      },
    });

    const coastalShield = await tx.carrier.create({
      data: {
        firmId: firm.id,
        name: "Coastal Shield Insurance",
        phone: "(866) 555-0118",
        email: "propertyclaims@coastalshield.example",
      },
    });

    const sarah = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Sarah",
        lastName: "Jenkins",
        email: "sarah.jenkins@example.com",
        phone: "(813) 555-0101",
        notes: "Prefers text first, then phone call.",
      },
    });

    const martinez = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Elena",
        lastName: "Martinez",
        email: "elena.martinez@example.com",
        phone: "(727) 555-0133",
      },
    });

    const priya = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Priya",
        lastName: "Shah",
        email: "priya.shah@example.com",
        phone: "(727) 555-0114",
        notes: "Owns a small duplex and prefers email summaries.",
      },
    });

    const newLeadContact = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Robert",
        lastName: "Hale",
        email: "robert.hale@example.com",
        phone: "(941) 555-0199",
      },
    });

    const plumber = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.REFERRAL_SOURCE,
        firstName: "Miguel",
        lastName: "Ortiz",
        company: "Ortiz Plumbing",
        phone: "(813) 555-0160",
      },
    });

    const sarahProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "412 Palm Avenue",
        city: "Tampa",
        state: "FL",
        postalCode: "33602",
        notes: "Kitchen supply line leak with cabinet and flooring damage.",
      },
    });

    const martinezProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "88 Bayview Drive",
        city: "St. Petersburg",
        state: "FL",
        postalCode: "33701",
        notes: "Wind and roof leak after storm.",
      },
    });

    const priyaProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "216 Orange Street",
        city: "Clearwater",
        state: "FL",
        postalCode: "33756",
        notes: "Duplex smoke cleanup and kitchen cabinet damage.",
      },
    });

    const haleProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "19 Shell Key Court",
        city: "Sarasota",
        state: "FL",
        postalCode: "34236",
      },
    });

    const sarahPolicy = await tx.policy.create({
      data: {
        firmId: firm.id,
        carrierId: gulfCoast.id,
        policyNumber: "GCM-HO-447812",
        claimNumber: "GCM-24-01882",
        effectiveDate: daysFromNow(-220),
        expirationDate: daysFromNow(145),
        deductibleCents: cents(2500),
        notes: "Homeowners policy with water damage endorsement.",
      },
    });

    const martinezPolicy = await tx.policy.create({
      data: {
        firmId: firm.id,
        carrierId: sunState.id,
        policyNumber: "SSI-HO-882140",
        claimNumber: "SSI-25-00918",
        effectiveDate: daysFromNow(-120),
        expirationDate: daysFromNow(245),
        deductibleCents: cents(5000),
      },
    });

    const priyaPolicy = await tx.policy.create({
      data: {
        firmId: firm.id,
        carrierId: coastalShield.id,
        policyNumber: "CSI-DP-771204",
        claimNumber: "CSI-25-00441",
        effectiveDate: daysFromNow(-300),
        expirationDate: daysFromNow(65),
        deductibleCents: cents(2500),
        notes: "Dwelling policy for a small rental property.",
      },
    });

    const feeRule = await tx.feeRule.create({
      data: {
        firmId: firm.id,
        name: "Standard public adjusting fee",
        percentageBasisPoints: 1000,
        appliesTo: "Accepted settlement",
        active: true,
      },
    });

    const waterLead = await tx.lead.create({
      data: {
        firmId: firm.id,
        contactId: sarah.id,
        propertyId: sarahProperty.id,
        assignedUserId: adjuster.id,
        source: "Referral",
        referralSource: "Ortiz Plumbing",
        lossType: "Water damage",
        dateOfLoss: daysFromNow(-32),
        status: LeadStatus.CONTACTED,
        followUpDate: daysFromNow(1, 10),
        notes: "Kitchen leak discovered after plumber shut off supply line.",
      },
    });

    const sarahClaim = await tx.claim.create({
      data: {
        firmId: firm.id,
        contactId: sarah.id,
        propertyId: sarahProperty.id,
        policyId: sarahPolicy.id,
        carrierId: gulfCoast.id,
        leadId: waterLead.id,
        assignedUserId: adjuster.id,
        claimNumber: "GCM-24-01882",
        lossType: "Water damage",
        dateOfLoss: daysFromNow(-32),
        reportedDate: daysFromNow(-30),
        inspectionDate: daysFromNow(-24),
        deadlineDate: daysFromNow(14),
        status: ClaimStatus.SETTLED,
        nextStep: "Collect the fee invoice after Sarah receives the settlement funds.",
        publicSummary: "Settlement reached. We are tracking the check and fee invoice.",
        notes: "Demo scenario: lead converted, documents collected, carrier offer recorded, settlement payment entered, and fee invoice sent.",
      },
    });

    await tx.lead.update({
      where: { id: waterLead.id },
      data: {
        status: LeadStatus.CONVERTED,
        convertedClaimId: sarahClaim.id,
      },
    });

    const martinezClaim = await tx.claim.create({
      data: {
        firmId: firm.id,
        contactId: martinez.id,
        propertyId: martinezProperty.id,
        policyId: martinezPolicy.id,
        carrierId: sunState.id,
        assignedUserId: owner.id,
        claimNumber: "SSI-25-00918",
        lossType: "Wind / roof leak",
        dateOfLoss: daysFromNow(-18),
        reportedDate: daysFromNow(-16),
        inspectionDate: daysFromNow(-7),
        deadlineDate: daysFromNow(5),
        status: ClaimStatus.WAITING_ON_CARRIER,
        nextStep: "Follow up with Sun State before the claim deadline and confirm estimate review.",
        publicSummary: "The carrier is reviewing the estimate and inspection photos.",
      },
    });

    const priyaClaim = await tx.claim.create({
      data: {
        firmId: firm.id,
        contactId: priya.id,
        propertyId: priyaProperty.id,
        policyId: priyaPolicy.id,
        carrierId: coastalShield.id,
        assignedUserId: adjuster.id,
        claimNumber: "CSI-25-00441",
        lossType: "Fire smoke damage",
        dateOfLoss: daysFromNow(-64),
        reportedDate: daysFromNow(-62),
        inspectionDate: daysFromNow(-56),
        deadlineDate: daysFromNow(6),
        status: ClaimStatus.SETTLED,
        nextStep: "Collect the remaining fee balance and mark invoice AD-1000 paid.",
        publicSummary: "Settlement payment was issued. The office is tracking the remaining fee balance.",
        notes: "Smoke cleanup claim added to make receivables and reports more realistic.",
      },
    });

    const haleLead = await tx.lead.create({
      data: {
        firmId: firm.id,
        contactId: newLeadContact.id,
        propertyId: haleProperty.id,
        assignedUserId: assistant.id,
        source: "Website",
        referralSource: "Google search",
        lossType: "Roof leak",
        dateOfLoss: daysFromNow(-4),
        status: LeadStatus.NEW,
        followUpDate: daysFromNow(0, 14),
        notes: "Ready to convert once the signed agreement is confirmed. Client asked for the first claim follow-up right away.",
      },
    });

    const olderLeadContact = await tx.contact.create({
      data: {
        firmId: firm.id,
        type: ContactType.CLIENT,
        firstName: "Nina",
        lastName: "Campbell",
        email: "nina.campbell@example.com",
        phone: "(813) 555-0177",
      },
    });

    const olderLeadProperty = await tx.property.create({
      data: {
        firmId: firm.id,
        address1: "704 Harbor Road",
        city: "Clearwater",
        state: "FL",
        postalCode: "33755",
      },
    });

    const olderLead = await tx.lead.create({
      data: {
        firmId: firm.id,
        contactId: olderLeadContact.id,
        propertyId: olderLeadProperty.id,
        assignedUserId: owner.id,
        source: "Past client",
        referralSource: "Sarah Jenkins",
        lossType: "Fire smoke damage",
        dateOfLoss: daysFromNow(-10),
        status: LeadStatus.CONTACTED,
        followUpDate: daysFromNow(-1, 11),
        notes: "Needs a second touch after sending photos by text.",
      },
    });

    await tx.task.createMany({
      data: [
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          assignedUserId: adjuster.id,
          title: "Call Sarah with settlement check update",
          notes: "Confirm whether the settlement check has arrived.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.HIGH,
          dueDate: daysFromNow(0, 10),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          assignedUserId: assistant.id,
          title: "Send fee invoice reminder",
          notes: "Attach invoice AD-1001 and ask about expected check date.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.NORMAL,
          dueDate: daysFromNow(2, 9),
        },
        {
          firmId: firm.id,
          claimId: martinezClaim.id,
          assignedUserId: owner.id,
          title: "Follow up with Sun State before claim deadline",
          notes: "Ask for status of roof estimate review and confirm what is needed before the deadline.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.HIGH,
          dueDate: daysFromNow(-1, 15),
        },
        {
          firmId: firm.id,
          claimId: martinezClaim.id,
          assignedUserId: adjuster.id,
          title: "Prepare supplemental photo packet",
          status: TaskStatus.OPEN,
          priority: TaskPriority.NORMAL,
          dueDate: daysFromNow(4, 13),
        },
        {
          firmId: firm.id,
          leadId: olderLead.id,
          assignedUserId: owner.id,
          title: "Call Nina Campbell about smoke damage photos",
          notes: "Second touch after photos were sent by text.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.HIGH,
          dueDate: daysFromNow(-1, 11),
        },
        {
          firmId: firm.id,
          claimId: priyaClaim.id,
          assignedUserId: assistant.id,
          title: "Call Priya about remaining fee balance",
          notes: "Confirm when the second invoice payment will be mailed.",
          status: TaskStatus.OPEN,
          priority: TaskPriority.NORMAL,
          dueDate: daysFromNow(1, 11),
        },
        {
          firmId: firm.id,
          leadId: haleLead.id,
          assignedUserId: assistant.id,
          title: "Call Robert Hale about roof leak lead",
          status: TaskStatus.OPEN,
          priority: TaskPriority.NORMAL,
          dueDate: daysFromNow(0, 14),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          assignedUserId: adjuster.id,
          title: "Upload signed adjusting contract",
          status: TaskStatus.DONE,
          priority: TaskPriority.NORMAL,
          dueDate: daysFromNow(-26, 12),
          completedAt: daysFromNow(-25, 16),
        },
      ],
    });

    await tx.document.createMany({
      data: [
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          uploadedByUserId: assistant.id,
          category: DocumentCategory.POLICY,
          title: "Policy declarations",
          fileName: "policy-declarations.pdf",
          filePath: "storage/uploads/demo-policy-declarations.pdf",
          mimeType: "application/pdf",
          sizeBytes: 248000,
          receivedAt: daysFromNow(-29),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          uploadedByUserId: owner.id,
          category: DocumentCategory.CONTRACT,
          title: "Signed public adjusting contract",
          fileName: "signed-contract.pdf",
          filePath: "storage/uploads/demo-signed-contract.pdf",
          mimeType: "application/pdf",
          sizeBytes: 180000,
          receivedAt: daysFromNow(-27),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          uploadedByUserId: adjuster.id,
          category: DocumentCategory.PHOTOS,
          title: "Kitchen and cabinet photos",
          fileName: "kitchen-photos.zip",
          filePath: "storage/uploads/demo-kitchen-photos.zip",
          mimeType: "application/zip",
          sizeBytes: 8400000,
          receivedAt: daysFromNow(-24),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          uploadedByUserId: adjuster.id,
          category: DocumentCategory.ESTIMATE,
          title: "Adjuster estimate",
          fileName: "adjuster-estimate.pdf",
          filePath: "storage/uploads/demo-adjuster-estimate.pdf",
          mimeType: "application/pdf",
          sizeBytes: 512000,
          receivedAt: daysFromNow(-18),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          uploadedByUserId: assistant.id,
          category: DocumentCategory.CARRIER_CORRESPONDENCE,
          title: "Carrier offer email",
          fileName: "carrier-offer-email.pdf",
          filePath: "storage/uploads/demo-carrier-offer-email.pdf",
          mimeType: "application/pdf",
          sizeBytes: 96000,
          receivedAt: daysFromNow(-6),
        },
        {
          firmId: firm.id,
          claimId: martinezClaim.id,
          uploadedByUserId: owner.id,
          category: DocumentCategory.PHOTOS,
          title: "Roof inspection photos",
          fileName: "roof-inspection-photos.zip",
          filePath: "storage/uploads/demo-roof-photos.zip",
          mimeType: "application/zip",
          sizeBytes: 6200000,
          receivedAt: daysFromNow(-7),
        },
        {
          firmId: firm.id,
          claimId: martinezClaim.id,
          category: DocumentCategory.OTHER,
          title: "Missing interior ceiling photos",
          notes: "Requested from client for status page.",
          requestedFromClient: true,
        },
        {
          firmId: firm.id,
          claimId: priyaClaim.id,
          uploadedByUserId: assistant.id,
          category: DocumentCategory.SETTLEMENT_DOCUMENTS,
          title: "Signed settlement release",
          fileName: "settlement-release.pdf",
          filePath: "storage/uploads/demo-settlement-release.pdf",
          mimeType: "application/pdf",
          sizeBytes: 144000,
          receivedAt: daysFromNow(-12),
        },
        {
          firmId: firm.id,
          claimId: priyaClaim.id,
          uploadedByUserId: adjuster.id,
          category: DocumentCategory.INVOICE,
          title: "Fee invoice AD-1000",
          fileName: "invoice-ad-1000.pdf",
          filePath: "storage/uploads/demo-invoice-ad-1000.pdf",
          mimeType: "application/pdf",
          sizeBytes: 88000,
          receivedAt: daysFromNow(-10),
        },
      ],
    });

    await tx.activity.createMany({
      data: [
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          contactId: sarah.id,
          userId: adjuster.id,
          type: ActivityType.CALL,
          subject: "Initial loss call",
          body: "Reviewed kitchen leak, mitigation status, and next steps for policy review.",
          occurredAt: daysFromNow(-32, 13),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          contactId: sarah.id,
          userId: owner.id,
          type: ActivityType.INSPECTION,
          subject: "Kitchen inspection completed",
          body: "Photos taken and cabinet/flooring measurements completed.",
          occurredAt: daysFromNow(-24, 10),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          userId: assistant.id,
          type: ActivityType.EMAIL,
          subject: "Carrier offer received",
          body: "Gulf Coast Mutual sent $31,000 first offer. Demand and estimate remain at $52,400.",
          occurredAt: daysFromNow(-6, 16),
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          contactId: sarah.id,
          userId: adjuster.id,
          type: ActivityType.TEXT,
          subject: "Settlement accepted",
          body: "Sarah confirmed acceptance of $44,000 settlement and understands invoice timing.",
          occurredAt: daysFromNow(-2, 11),
        },
        {
          firmId: firm.id,
          claimId: martinezClaim.id,
          contactId: martinez.id,
          userId: owner.id,
          type: ActivityType.MEETING,
          subject: "Roof inspection review",
          body: "Reviewed roof photos and requested interior ceiling photos.",
          occurredAt: daysFromNow(-7, 15),
        },
        {
          firmId: firm.id,
          leadId: olderLead.id,
          contactId: olderLeadContact.id,
          userId: owner.id,
          type: ActivityType.TEXT,
          subject: "Photos received by text",
          body: "Nina sent smoke damage photos and needs a follow-up call about next steps.",
          occurredAt: daysFromNow(-2, 16),
        },
        {
          firmId: firm.id,
          claimId: priyaClaim.id,
          contactId: priya.id,
          userId: adjuster.id,
          type: ActivityType.EMAIL,
          subject: "Settlement packet sent",
          body: "Sent final settlement paperwork and fee invoice AD-1000 after the carrier issued payment.",
          occurredAt: daysFromNow(-10, 10),
        },
        {
          firmId: firm.id,
          claimId: priyaClaim.id,
          contactId: priya.id,
          userId: assistant.id,
          type: ActivityType.CALL,
          subject: "Partial invoice payment received",
          body: "Priya mailed the first payment and expects to send the balance next week.",
          occurredAt: daysFromNow(-5, 14),
        },
      ],
    });

    await tx.settlementRound.createMany({
      data: [
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          roundNumber: 1,
          demandAmountCents: cents(52400),
          offerAmountCents: cents(31000),
          status: SettlementStatus.OFFER_RECEIVED,
          offeredAt: daysFromNow(-6, 15),
          notes: "Initial carrier offer after estimate review.",
        },
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          roundNumber: 2,
          demandAmountCents: cents(48000),
          offerAmountCents: cents(44000),
          acceptedAmountCents: cents(44000),
          status: SettlementStatus.ACCEPTED,
          offeredAt: daysFromNow(-2, 10),
          notes: "Accepted by client after discussion with adjuster.",
        },
        {
          firmId: firm.id,
          claimId: priyaClaim.id,
          roundNumber: 1,
          demandAmountCents: cents(39000),
          offerAmountCents: cents(36000),
          acceptedAmountCents: cents(36000),
          status: SettlementStatus.ACCEPTED,
          offeredAt: daysFromNow(-13, 13),
          notes: "Accepted smoke cleanup settlement after revised cabinet allowance.",
        },
      ],
    });

    const invoice = await tx.invoice.create({
      data: {
        firmId: firm.id,
        claimId: sarahClaim.id,
        feeRuleId: feeRule.id,
        invoiceNumber: "AD-1001",
        status: InvoiceStatus.SENT,
        settlementAmountCents: cents(44000),
        feePercentageBasisPoints: 1000,
        feeAmountCents: cents(4400),
        amountPaidCents: 0,
        issuedAt: daysFromNow(-1, 9),
        dueAt: daysFromNow(7, 17),
        notes: "10% fee on accepted settlement.",
      },
    });

    await tx.payment.create({
      data: {
        firmId: firm.id,
        claimId: sarahClaim.id,
        amountCents: cents(44000),
        paidAt: daysFromNow(-1, 12),
        checkNumber: "104928",
        payee: "Sarah Jenkins and Harbor Public Adjusting",
        notes: "Settlement check entered for tracking. Fee invoice remains unpaid.",
      },
    });

    const priyaInvoice = await tx.invoice.create({
      data: {
        firmId: firm.id,
        claimId: priyaClaim.id,
        feeRuleId: feeRule.id,
        invoiceNumber: "AD-1000",
        status: InvoiceStatus.PARTIALLY_PAID,
        settlementAmountCents: cents(36000),
        feePercentageBasisPoints: 1000,
        feeAmountCents: cents(3600),
        amountPaidCents: cents(1200),
        issuedAt: daysFromNow(-10, 9),
        dueAt: daysFromNow(-3, 17),
        notes: "First fee payment received; remaining balance is still open.",
      },
    });

    await tx.payment.create({
      data: {
        firmId: firm.id,
        claimId: priyaClaim.id,
        invoiceId: priyaInvoice.id,
        amountCents: cents(1200),
        paidAt: daysFromNow(-5, 13),
        checkNumber: "2284",
        payee: "Harbor Public Adjusting",
        notes: "Partial fee payment for invoice AD-1000.",
      },
    });

    await tx.clientStatusLink.createMany({
      data: [
        {
          firmId: firm.id,
          claimId: sarahClaim.id,
          token: "sarah-water-demo",
          isActive: true,
        },
        {
          firmId: firm.id,
          claimId: martinezClaim.id,
          token: "martinez-roof-demo",
          isActive: true,
        },
        {
          firmId: firm.id,
          claimId: priyaClaim.id,
          token: "priya-smoke-demo",
          isActive: true,
        },
      ],
    });

    await tx.template.createMany({
      data: [
        {
          firmId: firm.id,
          name: "Carrier follow-up",
          type: TemplateType.EMAIL,
          subject: "Follow-up on claim {{claimNumber}}",
          body: "Hello, checking on the current status of the claim review and any remaining documents needed from our office.",
        },
        {
          firmId: firm.id,
          name: "Client document request",
          type: TemplateType.TEXT,
          body: "Hi {{clientFirstName}}, please send the requested photos or documents when you have a moment. Thank you.",
        },
        {
          firmId: firm.id,
          name: "Claim follow-up letter",
          type: TemplateType.LETTER,
          subject: "Claim follow-up for {{clientLastName}} file",
          body: "Dear {{clientFirstName}},\n\nThis letter follows up on the current claim work and any items we still need from your office.\n\nThank you,\nAdjusterDesk Demo Office",
        },
        {
          firmId: firm.id,
          name: "Inspection checklist",
          type: TemplateType.CHECKLIST,
          body: "Policy declarations\nSigned contract\nDamage photos\nMitigation documents\nCarrier claim number",
        },
      ],
    });

    await tx.activity.create({
      data: {
        firmId: firm.id,
        leadId: waterLead.id,
        contactId: plumber.id,
        userId: assistant.id,
        type: ActivityType.NOTE,
        subject: "Referral source saved",
        body: "Miguel Ortiz referred Sarah after completing emergency plumbing work.",
        occurredAt: daysFromNow(-32, 9),
      },
    });

    void invoice;
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded Harbor Public Adjusting demo data.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
