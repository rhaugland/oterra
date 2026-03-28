import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/admin/sidebar";
import { EmailFab } from "@/components/admin/email-fab";

export default async function AuthenticatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Build a minimal Request-like object from the incoming cookies
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const fakeRequest = new Request("http://localhost", {
    headers: { cookie: cookieHeader },
  });

  const session = await getSession(fakeRequest);

  if (!session || session.type !== "user") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <EmailFab />
    </div>
  );
}
