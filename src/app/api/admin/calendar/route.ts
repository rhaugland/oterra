import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth-admin";
import { getCurrentUser, getScheduledEvents, getEventInvitees } from "@/lib/calendly";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const minTime = searchParams.get("min");
  const maxTime = searchParams.get("max");

  if (!minTime || !maxTime) {
    return NextResponse.json({ error: "min and max query params required" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const events = await getScheduledEvents(user.uri, minTime, maxTime);

    // Fetch invitees for each event
    const eventsWithInvitees = await Promise.all(
      events.map(async (event) => {
        try {
          const invitees = await getEventInvitees(event.uri);
          return {
            id: event.uri.split("/").pop(),
            name: event.name,
            status: event.status,
            startTime: event.start_time,
            endTime: event.end_time,
            location: event.location,
            invitees: invitees.map((inv) => ({
              name: inv.name,
              email: inv.email,
              status: inv.status,
            })),
          };
        } catch {
          return {
            id: event.uri.split("/").pop(),
            name: event.name,
            status: event.status,
            startTime: event.start_time,
            endTime: event.end_time,
            location: event.location,
            invitees: [],
          };
        }
      })
    );

    return NextResponse.json({ events: eventsWithInvitees });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch calendar";
    if (message.includes("not configured")) {
      return NextResponse.json({ error: message, events: [] }, { status: 200 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
