// PROTOTYPE — throwaway. Three Inbox variants for the ticket
// "How does the Inbox look and behave in Cadence's UI?".
// Three variants of the Inbox, switchable via `?variant=A|B|C`, mounted in the
// real app layout. Mock Notifications in memory; nothing is persisted and no
// vendor is called. Lives only on prototype/inbox-ui; never merge to main.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Bell,
  Inbox as InboxIcon,
  Receipt,
  UsersRound,
  MessageSquare,
  MessageCircleReply,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { UserRole } from "~/db/schema";
import { Button } from "~/components/ui/button";

// ─── Mock data, straight from the catalogue ─────────────────────────────────

type NotificationType =
  | "refund-request-raised"
  | "refund-request-approved"
  | "refund-request-declined"
  | "seat-claimed"
  | "question-asked"
  | "reply-received";

export interface MockNotification {
  id: string;
  type: NotificationType;
  title: string;
  excerpt?: string;
  ago: string;
  day: "Today" | "Earlier";
  href: string | null;
  seen: boolean;
  read: boolean;
}

const typeMeta: Record<
  NotificationType,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  "refund-request-raised": {
    label: "Refund Request raised",
    icon: <Receipt className="size-4" />,
    tone: "text-amber-600 bg-amber-500/10",
  },
  "refund-request-approved": {
    label: "Refund Request approved",
    icon: <CheckCircle2 className="size-4" />,
    tone: "text-emerald-600 bg-emerald-500/10",
  },
  "refund-request-declined": {
    label: "Refund Request declined",
    icon: <XCircle className="size-4" />,
    tone: "text-rose-600 bg-rose-500/10",
  },
  "seat-claimed": {
    label: "Seat claimed",
    icon: <UsersRound className="size-4" />,
    tone: "text-sky-600 bg-sky-500/10",
  },
  "question-asked": {
    label: "Question asked",
    icon: <MessageSquare className="size-4" />,
    tone: "text-violet-600 bg-violet-500/10",
  },
  "reply-received": {
    label: "Reply received",
    icon: <MessageCircleReply className="size-4" />,
    tone: "text-indigo-600 bg-indigo-500/10",
  },
};

// Lesson links point at /courses in the prototype; the real link is the lesson
// page scrolled to the thread.
function n(
  id: string,
  type: NotificationType,
  title: string,
  href: string | null,
  ago: string,
  opts: Partial<MockNotification> = {}
): MockNotification {
  return {
    id,
    type,
    title,
    href,
    ago,
    day: ago.endsWith("d ago") ? "Earlier" : "Today",
    seen: false,
    read: false,
    ...opts,
  };
}

function mockFor(role: UserRole | null, isTeamAdmin: boolean): MockNotification[] {
  if (role === UserRole.Admin)
    return [
      n("a1", "refund-request-raised", "Sam Okafor raised a Refund Request for React Fundamentals", "/admin/refunds", "4m ago", {
        excerpt: "The course moved too fast for me and I realised I needed the beginner track instead…",
      }),
      n("a2", "refund-request-raised", "Dana Whitfield raised a Refund Request for a Team Licence of TypeScript Pro", "/admin/refunds", "2h ago", {
        excerpt: "Our team was reorganised and nobody will be taking the course this quarter.",
      }),
      n("a3", "reply-received", "Priya Shah replied to your comment on “Intro to Loaders”", "/courses", "1d ago", {
        excerpt: "Thanks for the clarification — I've updated the lesson notes to match.",
        seen: true,
      }),
      n("a4", "refund-request-raised", "Leo Brandt raised a Refund Request for Advanced CSS", "/admin/refunds", "3d ago", {
        excerpt: "Duplicate purchase, I bought it twice by accident.",
        seen: true,
        read: true,
      }),
    ];
  if (role === UserRole.Instructor)
    return [
      n("i1", "question-asked", "New Question on “useEffect pitfalls” in React Fundamentals", "/instructor/questions", "12m ago", {
        excerpt: "Why does my effect run twice in development? I've removed StrictMode and it still…",
      }),
      n("i2", "question-asked", "New Question on “Generics 101” in TypeScript Pro", "/instructor/questions", "5h ago", {
        excerpt: "Is there a difference between <T,> and <T extends unknown> in a .tsx file?",
      }),
      n("i3", "reply-received", "Sam Okafor replied to your comment on “Course welcome”", "/courses", "1d ago", {
        excerpt: "Excited to start! Will there be exercises for each module?",
        seen: true,
      }),
      n("i4", "question-asked", "New Question on “Mapped types” in TypeScript Pro", "/instructor/questions", "4d ago", {
        excerpt: "The second example doesn't compile for me on TS 5.4.",
        seen: true,
        read: true,
      }),
    ];
  const student: MockNotification[] = [
    n("s1", "reply-received", "Your Instructor, Priya Shah, replied to your Question on “useEffect pitfalls”", "/courses", "8m ago", {
      excerpt: "Good catch — the double run is React's dev-only check. Here's how to tell them apart…",
    }),
    n("s2", "refund-request-declined", "Your Refund Request for Advanced CSS was declined", "/settings", "1d ago", {
      excerpt: "You've watched past the Watch Limit for this course, so it can't be refunded. You're still enrolled and can raise a new Refund Request if something else is wrong.",
    }),
    n("s3", "reply-received", "Dana Whitfield replied to your comment on “Grid basics”", "/courses", "2d ago", {
      excerpt: "Same problem here, clearing the cache fixed it for me.",
      seen: true,
      read: true,
    }),
  ];
  if (!isTeamAdmin) return student;
  return [
    n("t1", "seat-claimed", "Jordan Lee claimed a Seat on TypeScript Pro", "/team", "30m ago"),
    n("t2", "refund-request-approved", "Your Refund Request for a Team Licence of Advanced CSS was approved", "/team", "3h ago", {
      excerpt: "Approved — your 4 Unclaimed Seats are now closed.",
    }),
    n("t3", "seat-claimed", "Aisha Rahman claimed a Seat on TypeScript Pro", "/team", "2d ago", {
      seen: true,
    }),
    ...student,
  ];
}

export function useMockInbox(role: UserRole | null, isTeamAdmin: boolean) {
  const key = `${role}-${isTeamAdmin}`;
  const [state, setState] = useState<{ key: string; items: MockNotification[] }>(
    () => ({ key, items: mockFor(role, isTeamAdmin) })
  );
  // Reset when DevUI switches person.
  const items =
    state.key === key ? state.items : mockFor(role, isTeamAdmin);
  const set = (fn: (items: MockNotification[]) => MockNotification[]) =>
    setState({ key, items: fn(items) });

  return {
    items,
    unseen: items.filter((i) => !i.seen).length,
    unread: items.filter((i) => !i.read).length,
    markAllSeen: () => set((xs) => xs.map((x) => ({ ...x, seen: true }))),
    markRead: (id: string) =>
      set((xs) => xs.map((x) => (x.id === id ? { ...x, seen: true, read: true } : x))),
    markAllRead: () =>
      set((xs) => xs.map((x) => ({ ...x, seen: true, read: true }))),
  };
}

export type MockInbox = ReturnType<typeof useMockInbox>;

// ─── Shared bits ────────────────────────────────────────────────────────────

function TypeIcon({ type, className }: { type: NotificationType; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        typeMeta[type].tone,
        className
      )}
    >
      {typeMeta[type].icon}
    </span>
  );
}

function CountBadge({ count, red }: { count: number; red?: boolean }) {
  if (count === 0) return null;
  return (
    <span className={cn("ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none", red ? "bg-rose-500 text-white" : "bg-primary text-primary-foreground")}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
      <InboxIcon className="size-8 opacity-40" />
      <div className="font-medium text-foreground">You're all caught up</div>
      <div>Notifications about your courses, Refund Requests and Questions show up here.</div>
    </div>
  );
}

function useOpenNotification(inbox: MockInbox, after?: () => void) {
  const navigate = useNavigate();
  return (item: MockNotification) => {
    inbox.markRead(item.id);
    after?.();
    if (item.href) navigate(item.href);
  };
}

// ─── Variant A: bell in the sidebar header → compact popover ────────────────

export function VariantABell({ inbox }: { inbox: MockInbox }) {
  const [open, setOpen] = useState(false);
  const openItem = useOpenNotification(inbox, () => setOpen(false));
  const items = inbox.items.slice(0, 6);

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => {
          setOpen(!open);
          inbox.markAllSeen();
        }}
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title="Inbox"
      >
        <Bell className="size-4" />
        {inbox.unseen > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {inbox.unseen}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-50 w-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">Inbox</span>
              <button
                onClick={inbox.markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all as read
              </button>
            </div>
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="max-h-[28rem] divide-y overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => openItem(item)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left hover:bg-accent",
                        !item.read && "bg-primary/5"
                      )}
                    >
                      <TypeIcon type={item.type} className="size-7" />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "line-clamp-2 text-sm",
                            item.read ? "text-muted-foreground" : "font-medium"
                          )}
                        >
                          {item.title}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {item.ago}
                        </div>
                      </div>
                      {!item.read && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Variant B: "Inbox" nav item → right-hand slide-over with tabs ──────────

export function VariantBNavSheet({ inbox }: { inbox: MockInbox }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const openItem = useOpenNotification(inbox, () => setOpen(false));
  const shown = tab === "unread" ? inbox.items.filter((i) => !i.read) : inbox.items;
  const groups = (["Today", "Earlier"] as const)
    .map((day) => ({ day, items: shown.filter((i) => i.day === day) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          inbox.markAllSeen();
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          open
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <InboxIcon className="size-4" />
        Inbox
        <CountBadge count={inbox.unseen} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[440px] flex-col border-l bg-background shadow-2xl">
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <h2 className="text-lg font-semibold">Inbox</h2>
              <span className="text-sm text-muted-foreground">
                {inbox.unread} unread
              </span>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-1 border-b px-5 py-2">
              {(["unread", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm capitalize",
                    tab === t ? "bg-accent font-medium" : "text-muted-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
              <button
                onClick={inbox.markAllRead}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all as read
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {groups.length === 0 ? (
                <EmptyState />
              ) : (
                groups.map((g) => (
                  <section key={g.day}>
                    <div className="sticky top-0 bg-background/95 px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.day}
                    </div>
                    <div className="space-y-2 px-3 pb-2">
                      {g.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => openItem(item)}
                          className={cn(
                            "flex w-full gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                            item.read ? "border-transparent" : "border-border bg-card shadow-sm"
                          )}
                        >
                          <TypeIcon type={item.type} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-muted-foreground">
                              {typeMeta[item.type].label} · {item.ago}
                            </div>
                            <div
                              className={cn(
                                "mt-0.5 text-sm",
                                item.read ? "text-muted-foreground" : "font-medium"
                              )}
                            >
                              {item.title}
                            </div>
                            {item.excerpt && (
                              <div className="mt-1.5 line-clamp-2 border-l-2 pl-2 text-sm text-muted-foreground">
                                {item.excerpt}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

// ─── Variant C: "Inbox" nav item → full page, list + detail panes ───────────

export function VariantCNavLink({ inbox }: { inbox: MockInbox }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get("inbox") === "open";
  return (
    <button
      onClick={() => {
        inbox.markAllSeen();
        setSearchParams((prev) => {
          const p = new URLSearchParams(prev);
          p.set("inbox", "open");
          return p;
        });
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <InboxIcon className="size-4" />
      Inbox
      <CountBadge count={inbox.unseen} />
    </button>
  );
}

export function VariantCPage({ inbox }: { inbox: MockInbox }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const types = Array.from(new Set(inbox.items.map((i) => i.type)));
  const shown = filter === "all" ? inbox.items : inbox.items.filter((i) => i.type === filter);
  const selected = inbox.items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Inbox</h1>
        <span className="text-sm text-muted-foreground">{inbox.unread} unread</span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={inbox.markAllRead}>
          Mark all as read
        </Button>
      </header>
      <div className="flex flex-wrap gap-2 border-b px-6 py-2">
        {(["all", ...types] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              filter === t ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {t === "all" ? "All" : typeMeta[t].label}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <ul className="w-96 shrink-0 overflow-y-auto border-r">
          {shown.length === 0 && <EmptyState />}
          {shown.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  setSelectedId(item.id);
                  inbox.markRead(item.id);
                }}
                className={cn(
                  "flex w-full gap-3 border-b px-4 py-3 text-left",
                  selectedId === item.id ? "bg-accent" : "hover:bg-accent/50",
                  !item.read && "border-l-4 border-l-primary"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{typeMeta[item.type].label}</span>
                    <span>{item.ago}</span>
                  </div>
                  <div className={cn("mt-1 truncate text-sm", !item.read && "font-semibold")}>
                    {item.title}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <section className="flex-1 overflow-y-auto p-8">
          {selected ? (
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <TypeIcon type={selected.type} className="size-10" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {typeMeta[selected.type].label}
                  </div>
                  <div className="text-xs text-muted-foreground">{selected.ago}</div>
                </div>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{selected.title}</h2>
              {selected.excerpt && (
                <blockquote className="mt-4 rounded-md bg-muted p-4 text-sm">
                  {selected.excerpt}
                </blockquote>
              )}
              {selected.href ? (
                <Button className="mt-6" onClick={() => navigate(selected.href!)}>
                  Open <ArrowRight className="ml-1 size-4" />
                </Button>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">
                  Nothing to open: this Notification is just for your information.
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a Notification
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Variant D: the combination: "Inbox" nav item → A-style popover ─────────
// Badge counts UNREAD (clears only as each Notification is read), type icons,
// one-line excerpt under the title.

export function VariantDNavPopover({ inbox }: { inbox: MockInbox }) {
  const [open, setOpen] = useState(false);
  const openItem = useOpenNotification(inbox, () => setOpen(false));
  const items = inbox.items.slice(0, 6);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          open
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <InboxIcon className="size-4" />
        Inbox
        <CountBadge count={inbox.unread} red />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-full top-0 z-50 ml-3 w-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">Inbox</span>
              <button
                onClick={inbox.markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all as read
              </button>
            </div>
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="max-h-[28rem] divide-y overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => openItem(item)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left hover:bg-accent",
                        !item.read && "bg-primary/5"
                      )}
                    >
                      <TypeIcon type={item.type} className="size-7" />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "line-clamp-2 text-sm",
                            item.read ? "text-muted-foreground" : "font-medium"
                          )}
                        >
                          {item.title}
                        </div>
                        {item.excerpt && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.excerpt}
                          </div>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {item.ago}
                        </div>
                      </div>
                      {!item.read && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
