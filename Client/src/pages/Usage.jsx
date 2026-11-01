// Usage page: credit stats, per-project breakdown, and recent consumption table
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import AppShell from '../components/layout/AppShell';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import useUsage from '../hooks/useUsage';

const formatTokens = (n = 0) => (n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
};

export default function Usage() {
  const { data, isLoading, isError, error } = useUsage();

  useEffect(() => {
    if (isError) toast.error(error.response?.data?.message || "Could not load usage");
  }, [isError, error]);

  if (isLoading) {
    return (
      <AppShell title="Usage" description="Your credits and where they were spent">
        <p className="text-sm text-muted">Loading usage...</p>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Usage" description="Your credits and where they were spent">
        <p className="text-sm text-muted">Could not load usage.</p>
      </AppShell>
    );
  }

  const maxCredits = Math.max(...data.byProject.map((p) => p.credits), 1);

  return (
    <AppShell title="Usage" description="Your credits and where they were spent">
      <div className="flex flex-col gap-6">
        {/* Row of 4 StatCards: 4 cols on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="Credits left" value={data.credits} subtext={data.credits <= 0 ? "No credits left, refills at 12:00 AM IST" : "Available balance"} />

          <StatCard label="Used today" value={data.dailyUsed}>
            <div className="space-y-1.5 mt-2">
              <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-line">
                <div className="h-full bg-primary-gradient" style={{ width: `${Math.min(100, (data.dailyUsed / data.dailyLimit) * 100)}%` }} />
              </div>
              <div className="text-xs text-muted">{data.dailyUsed} / {data.dailyLimit} daily limit</div>
              <div className="text-xs text-muted">
                {data.dailyUsed >= data.dailyLimit ? "Daily limit reached, resets at 12:00 AM IST" : `${Math.round((data.dailyLimit - data.dailyUsed) * 100) / 100} credits left today`}
              </div>
            </div>
          </StatCard>

          <StatCard label="Total credits used" value={data.totalCreditsUsed.toLocaleString()} subtext="All-time consumption" />
          <StatCard label="Total tokens used" value={formatTokens(data.totalTokensUsed)} subtext="All-time throughput" />
        </div>

        {/* Two equal columns: Spent per project & Recent usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Spent per project Card */}
          <div className="bg-card border border-line rounded-2xl p-5 md:p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-4">Spent per project</h2>
            <div className="flex flex-col gap-4">
              {data.byProject.length === 0 ? (
                <p className="text-xs text-muted">No usage yet.</p>
              ) : (
                data.byProject.map((item) => (
                  <div key={item.projectId || item.name} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-ink truncate max-w-[220px]">{item.name}</span>
                      <span className="text-muted">{item.credits} credits</span>
                    </div>
                    <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-line">
                      <div className="h-full bg-primary-gradient" style={{ width: `${(item.credits / maxCredits) * 100}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent usage Card */}
          <div className="bg-card border border-line rounded-2xl p-5 md:p-6 shadow-sm overflow-hidden">
            <h2 className="text-base font-semibold text-ink mb-4">Recent usage</h2>

            {data.recent.length === 0 ? (
              <p className="text-xs text-muted">No usage yet.</p>
            ) : (
              <>
                {/* Desktop / Tablet Table (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th className="py-2.5 font-medium">Project</th>
                        <th className="py-2.5 font-medium">Mode</th>
                        <th className="py-2.5 font-medium">Agent</th>
                        <th className="py-2.5 font-medium text-right">Credits</th>
                        <th className="py-2.5 font-medium text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {data.recent.map((row, index) => (
                        <tr key={`${row.createdAt}-${index}`} className="hover:bg-surface">
                          <td className="py-3 font-medium text-ink truncate max-w-[140px]">{row.projectName}</td>
                          <td className="py-3">
                            <Badge variant={row.mode === 'build' ? 'purple' : 'primary'}>{row.mode}</Badge>
                          </td>
                          <td className="py-3">
                            <Badge variant={row.agent === 'coder' ? 'success' : 'neutral'}>{row.agent}</Badge>
                          </td>
                          <td className="py-3 font-medium text-ink text-right">{row.creditsUsed}</td>
                          <td className="py-3 text-muted text-right">{timeAgo(row.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Cards (md:hidden) */}
                <div className="md:hidden flex flex-col gap-3">
                  {data.recent.map((row, index) => (
                    <div key={`${row.createdAt}-${index}`} className="p-3.5 rounded-xl border border-line bg-surface flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-ink truncate">{row.projectName}</span>
                        <span className="text-ink font-semibold">{row.creditsUsed} credits</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={row.mode === 'build' ? 'purple' : 'primary'}>{row.mode}</Badge>
                          <Badge variant={row.agent === 'coder' ? 'success' : 'neutral'}>{row.agent}</Badge>
                        </div>
                        <span className="text-muted text-[11px]">{timeAgo(row.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
