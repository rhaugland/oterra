export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth is checked per-page in the room file browser pages (Task 10).
  // Public pages (login, auth, docusign-callback) require no auth.
  return <>{children}</>;
}
