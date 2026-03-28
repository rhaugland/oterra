const CALENDLY_API = "https://api.calendly.com";

function getToken(): string {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) throw new Error("CALENDLY_API_TOKEN not configured");
  return token;
}

async function calendlyFetch(path: string, params?: Record<string, string>) {
  const url = new URL(path, CALENDLY_API);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendly API ${res.status}: ${text}`);
  }

  return res.json();
}

export interface CalendlyEvent {
  uri: string;
  name: string;
  status: "active" | "canceled";
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type: string;
    location?: string;
    join_url?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  status: "active" | "canceled";
  created_at: string;
}

export async function getCurrentUser(): Promise<{ uri: string; name: string; email: string }> {
  const data = await calendlyFetch("/users/me");
  return {
    uri: data.resource.uri,
    name: data.resource.name,
    email: data.resource.email,
  };
}

export async function getScheduledEvents(
  userUri: string,
  minTime: string,
  maxTime: string
): Promise<CalendlyEvent[]> {
  const events: CalendlyEvent[] = [];
  let nextPage: string | null = null;

  do {
    const params: Record<string, string> = {
      user: userUri,
      min_start_time: minTime,
      max_start_time: maxTime,
      status: "active",
      count: "100",
      sort: "start_time:asc",
    };
    if (nextPage) {
      params.page_token = nextPage;
    }

    const data = await calendlyFetch("/scheduled_events", params);
    events.push(...(data.collection as CalendlyEvent[]));
    nextPage = data.pagination?.next_page_token ?? null;
  } while (nextPage);

  return events;
}

export async function getEventInvitees(eventUri: string): Promise<CalendlyInvitee[]> {
  const uuid = eventUri.split("/").pop();
  const data = await calendlyFetch(`/scheduled_events/${uuid}/invitees`);
  return data.collection as CalendlyInvitee[];
}
