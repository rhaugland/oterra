"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Invitee {
  name: string;
  email: string;
  status: string;
}

interface CalendarEvent {
  id: string;
  name: string;
  status: string;
  startTime: string;
  endTime: string;
  location?: {
    type: string;
    location?: string;
    join_url?: string;
  };
  invitees: Invitee[];
}

type ViewMode = "month" | "week";

// ── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDuration(start: string, end: string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-md border border-ottera-red-200/60 bg-ottera-red-50/50 px-2 py-1.5 cursor-pointer hover:bg-ottera-red-50 transition-colors ${
        compact ? "text-[10px]" : "text-xs"
      }`}
      onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
    >
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-ottera-red-600 shrink-0" />
        <span className="font-medium text-gray-900 truncate">{event.name}</span>
      </div>
      <div className="text-gray-500 mt-0.5">
        {formatTime(event.startTime)} · {formatDuration(event.startTime, event.endTime)}
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-ottera-red-200/40 space-y-1.5">
          {event.invitees.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase">Attendees</p>
              {event.invitees.map((inv, i) => (
                <div key={i} className="text-xs text-gray-700">
                  {inv.name} <span className="text-gray-400">({inv.email})</span>
                </div>
              ))}
            </div>
          )}
          {event.location?.join_url && (
            <a
              href={event.location.join_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M1 9.5A3.5 3.5 0 0 0 4.5 13H12a3 3 0 0 0 .917-5.857 2.503 2.503 0 0 0-3.198-3.019 3.5 3.5 0 0 0-6.628 2.171A3.5 3.5 0 0 0 1 9.5Z" />
              </svg>
              Join meeting
            </a>
          )}
          {event.location?.location && !event.location.join_url && (
            <p className="text-[11px] text-gray-600">{event.location.location}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Month view ───────────────────────────────────────────────────────────────

function MonthView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart);

  // Build 6 weeks of days
  const weeks: Date[][] = [];
  let current = new Date(calStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current = addDays(current, 1);
    }
    weeks.push(week);
    // Stop if we've passed the month and filled at least 4 weeks
    if (current > monthEnd && w >= 3) break;
  }

  const today = new Date();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-100 last:border-0">
          {week.map((day) => {
            const isCurrentMonth = day.getMonth() === date.getMonth();
            const isToday = isSameDay(day, today);
            const dayEvents = events.filter((e) => isSameDay(new Date(e.startTime), day));

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-1.5 ${isCurrentMonth ? "" : "bg-gray-50/50"}`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  isToday
                    ? "w-6 h-6 flex items-center justify-center rounded-full bg-ottera-red-600 text-white"
                    : isCurrentMonth ? "text-gray-700" : "text-gray-300"
                }`}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <EventCard key={e.id} event={e} compact />
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-[10px] text-gray-400 text-center">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Week view ────────────────────────────────────────────────────────────────

function WeekView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {days.map((day) => {
        const isToday = isSameDay(day, today);
        const dayEvents = events.filter((e) => isSameDay(new Date(e.startTime), day));

        return (
          <div
            key={day.toISOString()}
            className={`flex border-b border-gray-100 last:border-0 ${isToday ? "bg-ottera-red-50/30" : ""}`}
          >
            {/* Day label */}
            <div className={`w-20 shrink-0 px-3 py-3 border-r border-gray-100 ${isToday ? "bg-ottera-red-50/50" : "bg-gray-50"}`}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p className={`text-lg font-bold ${isToday ? "text-ottera-red-600" : "text-gray-900"}`}>
                {day.getDate()}
              </p>
              <p className="text-[10px] text-gray-400">
                {day.toLocaleDateString("en-US", { month: "short" })}
              </p>
            </div>

            {/* Events */}
            <div className="flex-1 px-3 py-2 space-y-1.5 min-h-[72px]">
              {dayEvents.length === 0 ? (
                <p className="text-xs text-gray-300 py-2">No events</p>
              ) : (
                dayEvents.map((e) => <EventCard key={e.id} event={e} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sample data ──────────────────────────────────────────────────────────────

function generateSampleEvents(referenceDate: Date): CalendarEvent[] {
  const ws = startOfWeek(referenceDate);
  const samples: CalendarEvent[] = [
    {
      id: "sample-1",
      name: "Intro Call — Sequoia Capital",
      status: "active",
      startTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 1, 10, 0).toISOString(),
      endTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 1, 10, 30).toISOString(),
      location: { type: "zoom", join_url: "https://zoom.us/j/example" },
      invitees: [{ name: "Amanda Liu", email: "amanda@sequoiacap.com", status: "active" }],
    },
    {
      id: "sample-2",
      name: "Due Diligence Review",
      status: "active",
      startTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 1, 14, 0).toISOString(),
      endTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 1, 15, 0).toISOString(),
      location: { type: "zoom", join_url: "https://zoom.us/j/example2" },
      invitees: [
        { name: "Mike Chen", email: "mike@investco.com", status: "active" },
        { name: "Sarah Johnson", email: "sarah@acmecorp.com", status: "active" },
      ],
    },
    {
      id: "sample-3",
      name: "Investor Update — a16z",
      status: "active",
      startTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 2, 9, 0).toISOString(),
      endTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 2, 9, 45).toISOString(),
      location: { type: "google_meet", join_url: "https://meet.google.com/abc-defg-hij" },
      invitees: [{ name: "James Park", email: "james@a16z.com", status: "active" }],
    },
    {
      id: "sample-4",
      name: "NDA Follow-up — Global VC",
      status: "active",
      startTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 3, 11, 0).toISOString(),
      endTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 3, 11, 30).toISOString(),
      invitees: [{ name: "Lisa Park", email: "lisa@globalvc.com", status: "active" }],
    },
    {
      id: "sample-5",
      name: "Board Prep — Internal",
      status: "active",
      startTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 4, 13, 0).toISOString(),
      endTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 4, 14, 30).toISOString(),
      invitees: [
        { name: "Ryan Haugland", email: "ryan@ottera.tv", status: "active" },
        { name: "Team Lead", email: "lead@ottera.tv", status: "active" },
      ],
    },
    {
      id: "sample-6",
      name: "Series B Term Sheet Discussion",
      status: "active",
      startTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 4, 16, 0).toISOString(),
      endTime: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 4, 17, 0).toISOString(),
      location: { type: "zoom", join_url: "https://zoom.us/j/example3" },
      invitees: [{ name: "David Kim", email: "david@tigerglobal.com", status: "active" }],
    },
  ];
  return samples;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSample, setUsingSample] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsingSample(false);

    let min: Date;
    let max: Date;

    if (view === "month") {
      min = startOfMonth(date);
      min = startOfWeek(min);
      max = endOfMonth(date);
      max = addDays(max, 7);
    } else {
      min = startOfWeek(date);
      max = addDays(min, 7);
    }

    try {
      const res = await fetch(
        `/api/admin/calendar?min=${min.toISOString()}&max=${max.toISOString()}`
      );
      const data = await res.json();

      if (data.error && data.error.includes("not configured")) {
        // Show sample data when Calendly isn't configured
        setEvents(generateSampleEvents(date));
        setUsingSample(true);
        setError(null);
      } else if (data.error && !data.events) {
        setError(data.error);
        setEvents([]);
      } else {
        setEvents(data.events ?? []);
        if (data.error) setError(data.error);
      }
    } catch {
      setError("Failed to fetch calendar events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [view, date]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function navigateBack() {
    const d = new Date(date);
    if (view === "month") {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setDate(d);
  }

  function navigateForward() {
    const d = new Date(date);
    if (view === "month") {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setDate(d);
  }

  function goToday() {
    setDate(new Date());
  }

  const headerLabel = view === "month"
    ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : (() => {
        const ws = startOfWeek(date);
        const we = addDays(ws, 6);
        const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
        return `${ws.toLocaleDateString("en-US", opts)} – ${we.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
      })();

  const upcomingEvents = events
    .filter((e) => new Date(e.startTime) >= new Date())
    .slice(0, 5);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Calendly events and scheduled meetings</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={navigateBack}
            className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={navigateForward}
            className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 ml-2">{headerLabel}</h2>
        </div>

        {loading && (
          <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
        )}
      </div>

      {/* Sample data notice */}
      {usingSample && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-500 shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">Showing sample calendar data</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Connect Calendly by adding <code className="bg-blue-100 px-1 rounded">CALENDLY_API_TOKEN</code> to your <code className="bg-blue-100 px-1 rounded">.env.local</code> file. Get your token from Calendly → Integrations → API.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Calendar */}
        <div className="flex-1">
          {view === "month" ? (
            <MonthView date={date} events={events} />
          ) : (
            <WeekView date={date} events={events} />
          )}
        </div>

        {/* Upcoming sidebar */}
        <div className="w-72 shrink-0 hidden xl:block">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Upcoming</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-gray-400">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((e) => {
                  const eventDate = new Date(e.startTime);
                  const isToday = isSameDay(eventDate, new Date());
                  const isTomorrow = isSameDay(eventDate, addDays(new Date(), 1));
                  const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : eventDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

                  return (
                    <div key={e.id} className="border-l-2 border-ottera-red-600 pl-3">
                      <p className="text-[10px] font-semibold text-ottera-red-600 uppercase">{dayLabel}</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatTime(e.startTime)} – {formatTime(e.endTime)}
                      </p>
                      {e.invitees.length > 0 && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {e.invitees.map((i) => i.name).join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
