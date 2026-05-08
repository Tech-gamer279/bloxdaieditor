import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type UpdateEntry = {
  date: string;
  change: string;
};

interface UpdateLogProps {
  entries?: UpdateEntry[];
}

const defaultEntries: UpdateEntry[] = [
  { date: "2026-05-08", change: "Full database migration: snippets, forum, community, schematics, mods, badges, and profiles now powered by PostgreSQL. Badge system launched — admins can create custom badges and grant them to users. DM and channel access is now membership-gated for security." },
  { date: "2026-05-06", change: "Added admin dashboard with 20 editor features and tabs." },
  { date: "2026-05-04", change: "Enabled profile media uploads and friend manager integration." },
  { date: "2026-05-01", change: "Improved community moderation and live status widgets." },
  { date: "2026-04-28", change: "Added developer notes, audit trails, and quick action cards." },
];

const UpdateLog = ({ entries = defaultEntries }: UpdateLogProps) => {
  return (
    <Card className="space-y-4">
      <CardHeader>
        <CardTitle>Update Log</CardTitle>
        <CardDescription>Track recent changes, release notes, and admin updates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry, i) => (
          <div key={entry.date + i} className="rounded-lg border border-border bg-background/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-foreground">{entry.date}</p>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Update</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{entry.change}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default UpdateLog;
