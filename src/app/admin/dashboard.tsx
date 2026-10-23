"use client";

// The dashboard shell: live statistics, charts, and the application / volunteer / opportunity
// workspaces.
//
// Every panel reads from a protected API through useLiveData, which polls every 4 seconds, skips
// re-renders when the payload is unchanged, pauses on a hidden tab and stops on unmount. A 401
// from any poll (expired session) bounces the administrator back to the login page rather than
// silently showing stale data.

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/common/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarList, TrendChart } from "@/components/admin/charts";
import { fetchJson, useLiveData } from "@/lib/hooks/use-live-data";
import { applicationStatuses, type ApplicationStatus } from "@content/education";
import { cn } from "@/lib/utils";
import { ApplicationsPanel } from "./applications-panel";
import { VolunteersPanel } from "./volunteers-panel";
import { OpportunitiesPanel } from "./opportunities-panel";
import { SettingsPanel } from "./settings-panel";
import type { Overview } from "@/server/db/analytics";

export const POLL_INTERVAL_MS = 4000;

export function AdminDashboard({ admin }: { admin: { name: string; email: string } }) {
  const router = useRouter();
  const [tab, setTab] = React.useState("overview");

  const onUnauthorized = React.useCallback(() => {
    router.replace("/admin/login");
  }, [router]);

  const overview = useLiveData<Overview>({
    fetcher: (signal) => fetchJson<Overview>("/api/admin/overview", { signal }),
    intervalMs: POLL_INTERVAL_MS,
    onUnauthorized,
  });

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const data = overview.data;

  return (
    <>
      <div className="border-b border-border bg-secondary/30 py-6">
        <Container className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              SevaDeep Administration
            </p>
            <h1 className="mt-1 font-heading text-display-4 font-semibold text-foreground">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {admin.name} ({admin.email})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className={cn("size-3.5", overview.refreshing && "animate-spin")} />
              {overview.failures > 0
                ? `Reconnecting… (${overview.failures} failed)`
                : `Live · every ${POLL_INTERVAL_MS / 1000}s`}
            </p>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={signOut}>
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        </Container>
      </div>

      {/* Section's default vertical rhythm (py-16 / sm:py-20 / lg:py-24) is right for a marketing
          page and far too airy for a dense dashboard, so every breakpoint is overridden here. */}
      <Section className="pt-6 pb-16 sm:pt-6 lg:pt-8">
        <Container className="space-y-8">
          {overview.error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
            >
              {overview.error}
            </div>
          )}

          <StatGrid data={data} loading={overview.loading} />

          <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="applications">
                Applications{data ? ` (${data.applications.total})` : ""}
              </TabsTrigger>
              <TabsTrigger value="volunteers">
                Volunteers{data ? ` (${data.volunteers.total})` : ""}
              </TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <TrendChart
                  title="Application submissions — last 14 days"
                  subtitle="Applications received per day, from stored records"
                  data={data?.charts.applicationTrend ?? []}
                  emptyMessage="No applications submitted in the last 14 days yet."
                />
                <BarList
                  title="Applications by status"
                  subtitle="Current status of every stored application"
                  keyHeader="Status"
                  data={data?.charts.applicationsByStatus ?? []}
                  emptyMessage="No applications yet. Submitted applications appear here automatically."
                />
                <BarList
                  title="Volunteer skill distribution"
                  subtitle="How many registered volunteers offer each skill (top 10)"
                  keyHeader="Skill"
                  limit={10}
                  data={data?.charts.volunteerSkills ?? []}
                  emptyMessage="No volunteer registrations yet. New registrations appear here automatically."
                />
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    Opportunity catalogue
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Roles the matching engine scores volunteers against
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Active</dt>
                      <dd className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                        {data?.opportunities.active ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Total</dt>
                      <dd className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                        {data?.opportunities.total ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Manage these on the Opportunities tab. Deactivating a role removes it from new
                    volunteers&apos; recommendations without deleting past matches.
                  </p>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="applications" className="pt-6">
              <ApplicationsPanel active={tab === "applications"} onUnauthorized={onUnauthorized} />
            </TabsContent>

            <TabsContent value="volunteers" className="pt-6">
              <VolunteersPanel active={tab === "volunteers"} onUnauthorized={onUnauthorized} />
            </TabsContent>

            <TabsContent value="opportunities" className="pt-6">
              <OpportunitiesPanel
                active={tab === "opportunities"}
                onUnauthorized={onUnauthorized}
              />
            </TabsContent>

            <TabsContent value="settings" className="pt-6">
              <SettingsPanel active={tab === "settings"} onUnauthorized={onUnauthorized} />
            </TabsContent>
          </Tabs>
        </Container>
      </Section>
    </>
  );
}

/**
 * Status tiles. Status colour appears here as a labelled dot beside written text — never as the
 * only cue — which is why the charts themselves use a single hue.
 */
const statusDot: Record<ApplicationStatus, string> = {
  Submitted: "bg-chart-5",
  "Under Review": "bg-warning",
  Approved: "bg-success",
  Rejected: "bg-destructive",
};

function StatGrid({ data, loading }: { data: Overview | null; loading: boolean }) {
  const tiles: { label: string; value: number | null; dotClass?: string }[] = [
    { label: "Total applications", value: data?.applications.total ?? null },
    ...applicationStatuses.map((status) => ({
      label: status,
      value: data?.applications.byStatus[status] ?? null,
      dotClass: statusDot[status],
    })),
    { label: "Volunteer registrations", value: data?.volunteers.total ?? null },
    { label: "Awaiting contact", value: data?.volunteers.pending ?? null },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm"
        >
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {tile.dotClass && (
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", tile.dotClass)} />
            )}
            <span className="truncate">{tile.label}</span>
          </dt>
          <dd className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
            {tile.value === null ? (
              <span className="text-muted-foreground">{loading ? "…" : "0"}</span>
            ) : (
              tile.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
