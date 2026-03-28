import { prisma } from "@/lib/prisma";
import { ContactTable } from "@/components/admin/contact-table";
import { AddContactForm } from "@/components/admin/add-contact-form";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      accesses: {
        select: {
          id: true,
          approvalStatus: true,
          ndaStatus: true,
        },
      },
    },
  });

  const contactRows = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    company: contact.company,
    status: contact.status as string,
    investorType: contact.investorType as string | null,
    geography: contact.geography as string | null,
    checkSize: contact.checkSize as string | null,
    roomCount: contact.accesses.length,
    approvalCounts: {
      approved: contact.accesses.filter((a) => a.approvalStatus === "approved").length,
      pending: contact.accesses.filter((a) => a.approvalStatus === "pending").length,
      denied: contact.accesses.filter((a) => a.approvalStatus === "denied").length,
    },
  }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} total
          </p>
        </div>
        <AddContactForm />
      </div>

      <ContactTable contacts={contactRows} />
    </div>
  );
}
