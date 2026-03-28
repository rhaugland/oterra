import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ContactAuthPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect("/room/login?error=missing-token");
  }

  // Delegate to the verify API route which sets the cookie and redirects
  redirect(`/api/contact/auth/verify?token=${encodeURIComponent(token)}`);
}
