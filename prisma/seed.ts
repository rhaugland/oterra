import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createClient();

async function main() {
  console.log("Seeding database...");

  // ─── Users ────────────────────────────────────────────────────────────────

  const systemUser = await prisma.user.upsert({
    where: { email: "system@internal" },
    update: {},
    create: {
      email: "system@internal",
      name: "System",
      passwordHash: bcrypt.hashSync("not-a-real-password", 10),
      role: "admin",
    },
  });
  console.log("Upserted system user:", systemUser.id);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      name: "Admin User",
      passwordHash: bcrypt.hashSync("password123", 10),
      role: "admin",
    },
  });
  console.log("Upserted admin user:", adminUser.id);

  const memberUser = await prisma.user.upsert({
    where: { email: "member@test.com" },
    update: {},
    create: {
      email: "member@test.com",
      name: "Team Member",
      passwordHash: bcrypt.hashSync("password123", 10),
      role: "member",
    },
  });
  console.log("Upserted member user:", memberUser.id);

  // ─── Data Rooms ───────────────────────────────────────────────────────────

  // Acme Corp room — upsert by name + createdById is not unique, so we
  // use findFirst + conditional create to keep the script idempotent.
  let acmeRoom = await prisma.dataRoom.findFirst({
    where: { name: "Acme Corp - Series B", createdById: adminUser.id },
  });
  if (!acmeRoom) {
    acmeRoom = await prisma.dataRoom.create({
      data: {
        name: "Acme Corp - Series B",
        description: "Series B fundraising data room for Acme Corp",
        createdById: adminUser.id,
      },
    });
    console.log("Created Acme room:", acmeRoom.id);
  } else {
    console.log("Found existing Acme room:", acmeRoom.id);
  }

  let phoenixRoom = await prisma.dataRoom.findFirst({
    where: { name: "Project Phoenix", createdById: adminUser.id },
  });
  if (!phoenixRoom) {
    phoenixRoom = await prisma.dataRoom.create({
      data: {
        name: "Project Phoenix",
        description: "M&A due diligence data room",
        createdById: adminUser.id,
      },
    });
    console.log("Created Phoenix room:", phoenixRoom.id);
  } else {
    console.log("Found existing Phoenix room:", phoenixRoom.id);
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────

  // Tags have a @@unique([name, dataRoomId]) constraint — safe to upsert.
  const [tagFinancials, tagLegal, tagTechnical] = await Promise.all([
    prisma.tag.upsert({
      where: { name_dataRoomId: { name: "Financials", dataRoomId: acmeRoom.id } },
      update: {},
      create: { name: "Financials", color: "blue", dataRoomId: acmeRoom.id },
    }),
    prisma.tag.upsert({
      where: { name_dataRoomId: { name: "Legal", dataRoomId: acmeRoom.id } },
      update: {},
      create: { name: "Legal", color: "red", dataRoomId: acmeRoom.id },
    }),
    prisma.tag.upsert({
      where: { name_dataRoomId: { name: "Technical", dataRoomId: acmeRoom.id } },
      update: {},
      create: { name: "Technical", color: "green", dataRoomId: acmeRoom.id },
    }),
  ]);

  const [tagDueDiligence, tagOperations] = await Promise.all([
    prisma.tag.upsert({
      where: { name_dataRoomId: { name: "Due Diligence", dataRoomId: phoenixRoom.id } },
      update: {},
      create: { name: "Due Diligence", color: "purple", dataRoomId: phoenixRoom.id },
    }),
    prisma.tag.upsert({
      where: { name_dataRoomId: { name: "Operations", dataRoomId: phoenixRoom.id } },
      update: {},
      create: { name: "Operations", color: "orange", dataRoomId: phoenixRoom.id },
    }),
  ]);
  console.log("Upserted tags:", [tagFinancials, tagLegal, tagTechnical, tagDueDiligence, tagOperations].map((t) => t.name).join(", "));

  // ─── Contacts ─────────────────────────────────────────────────────────────

  const sarahContact = await prisma.contact.upsert({
    where: { email: "sarah@acmecorp.com" },
    update: {},
    create: {
      email: "sarah@acmecorp.com",
      name: "Sarah Johnson",
      company: "Acme Corp",
      createdById: adminUser.id,
    },
  });

  const mikeContact = await prisma.contact.upsert({
    where: { email: "mike@investco.com" },
    update: {},
    create: {
      email: "mike@investco.com",
      name: "Mike Chen",
      company: "InvestCo",
      createdById: adminUser.id,
    },
  });

  const lisaContact = await prisma.contact.upsert({
    where: { email: "lisa@globalvc.com" },
    update: {},
    create: {
      email: "lisa@globalvc.com",
      name: "Lisa Park",
      company: "Global VC",
      createdById: adminUser.id,
    },
  });
  console.log("Upserted contacts:", [sarahContact, mikeContact, lisaContact].map((c) => c.name).join(", "));

  // ─── DataRoomAccess ───────────────────────────────────────────────────────

  // @@unique([contactId, dataRoomId]) — safe to upsert.
  await prisma.dataRoomAccess.upsert({
    where: {
      contactId_dataRoomId: { contactId: sarahContact.id, dataRoomId: acmeRoom.id },
    },
    update: {},
    create: {
      contactId: sarahContact.id,
      dataRoomId: acmeRoom.id,
      ndaStatus: "signed",
      approvalStatus: "pending",
    },
  });

  await prisma.dataRoomAccess.upsert({
    where: {
      contactId_dataRoomId: { contactId: mikeContact.id, dataRoomId: phoenixRoom.id },
    },
    update: {},
    create: {
      contactId: mikeContact.id,
      dataRoomId: phoenixRoom.id,
      ndaStatus: "sent",
      approvalStatus: "pending",
    },
  });

  await prisma.dataRoomAccess.upsert({
    where: {
      contactId_dataRoomId: { contactId: lisaContact.id, dataRoomId: acmeRoom.id },
    },
    update: {},
    create: {
      contactId: lisaContact.id,
      dataRoomId: acmeRoom.id,
      ndaStatus: "not_sent",
      approvalStatus: "pending",
    },
  });
  console.log("Upserted DataRoomAccess records");

  // ─── Files ────────────────────────────────────────────────────────────────

  // Files have no natural unique constraint beyond their UUID id. Use
  // findFirst on (name, dataRoomId) to keep the script idempotent.
  type FileSpec = {
    name: string;
    mimeType: string;
    size: number;
    storageKey: string;
    dataRoomId: string;
    uploadedById: string;
    tagIds: string[];
  };

  async function upsertFile(spec: FileSpec) {
    let file = await prisma.file.findFirst({
      where: { name: spec.name, dataRoomId: spec.dataRoomId },
    });
    if (!file) {
      file = await prisma.file.create({
        data: {
          name: spec.name,
          mimeType: spec.mimeType,
          size: spec.size,
          storageKey: spec.storageKey,
          status: "ready",
          dataRoomId: spec.dataRoomId,
          uploadedById: spec.uploadedById,
          tags: {
            create: spec.tagIds.map((tagId) => ({ tagId })),
          },
        },
      });
      console.log("Created file:", file.name);
    } else {
      console.log("Found existing file:", file.name);
    }
    return file;
  }

  await upsertFile({
    name: "Financial_Projections_2026.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 204800,
    storageKey: "acme/financial_projections_2026.xlsx",
    dataRoomId: acmeRoom.id,
    uploadedById: adminUser.id,
    tagIds: [tagFinancials.id],
  });

  await upsertFile({
    name: "Cap_Table.pdf",
    mimeType: "application/pdf",
    size: 102400,
    storageKey: "acme/cap_table.pdf",
    dataRoomId: acmeRoom.id,
    uploadedById: adminUser.id,
    tagIds: [tagFinancials.id],
  });

  await upsertFile({
    name: "Technical_Architecture.pdf",
    mimeType: "application/pdf",
    size: 512000,
    storageKey: "acme/technical_architecture.pdf",
    dataRoomId: acmeRoom.id,
    uploadedById: adminUser.id,
    tagIds: [tagTechnical.id],
  });

  await upsertFile({
    name: "NDA_Template.pdf",
    mimeType: "application/pdf",
    size: 51200,
    storageKey: "acme/nda_template.pdf",
    dataRoomId: acmeRoom.id,
    uploadedById: adminUser.id,
    tagIds: [tagLegal.id],
  });

  await upsertFile({
    name: "Due_Diligence_Checklist.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 153600,
    storageKey: "phoenix/due_diligence_checklist.xlsx",
    dataRoomId: phoenixRoom.id,
    uploadedById: adminUser.id,
    tagIds: [tagDueDiligence.id],
  });

  await upsertFile({
    name: "Operations_Manual.pdf",
    mimeType: "application/pdf",
    size: 307200,
    storageKey: "phoenix/operations_manual.pdf",
    dataRoomId: phoenixRoom.id,
    uploadedById: adminUser.id,
    tagIds: [tagOperations.id],
  });

  // ─── AuditLog ─────────────────────────────────────────────────────────────

  // AuditLog has no unique constraint on business keys — seed entries are
  // append-only. Guard with a count check so repeated runs don't pile up rows.
  const auditCount = await prisma.auditLog.count({
    where: { actorId: adminUser.id, action: "seed" },
  });

  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          action: "seed",
          actorType: "system",
          actorId: systemUser.id,
          resourceType: "DataRoom",
          resourceId: acmeRoom.id,
          metadata: { note: "Initial seed" },
        },
        {
          action: "seed",
          actorType: "system",
          actorId: systemUser.id,
          resourceType: "DataRoom",
          resourceId: phoenixRoom.id,
          metadata: { note: "Initial seed" },
        },
        {
          action: "data_room.created",
          actorType: "user",
          actorId: adminUser.id,
          resourceType: "DataRoom",
          resourceId: acmeRoom.id,
          metadata: { roomName: "Acme Corp - Series B" },
        },
        {
          action: "data_room.created",
          actorType: "user",
          actorId: adminUser.id,
          resourceType: "DataRoom",
          resourceId: phoenixRoom.id,
          metadata: { roomName: "Project Phoenix" },
        },
        {
          action: "contact.invited",
          actorType: "user",
          actorId: adminUser.id,
          resourceType: "Contact",
          resourceId: sarahContact.id,
          metadata: { email: "sarah@acmecorp.com", roomName: "Acme Corp - Series B" },
        },
        {
          action: "contact.invited",
          actorType: "user",
          actorId: adminUser.id,
          resourceType: "Contact",
          resourceId: mikeContact.id,
          metadata: { email: "mike@investco.com", roomName: "Project Phoenix" },
        },
        {
          action: "nda.signed",
          actorType: "contact",
          actorId: sarahContact.id,
          resourceType: "DataRoomAccess",
          resourceId: acmeRoom.id,
          metadata: { contactEmail: "sarah@acmecorp.com" },
        },
      ],
    });
    console.log("Created AuditLog entries");
  } else {
    console.log("Skipping AuditLog entries — already seeded");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
