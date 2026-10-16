// Usage page: credit stats, per-project breakdown, and recent consumption table
import React from 'react';
import AppShell from '../components/layout/AppShell';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';

// MOCK DATA: replace with API data later
const SPENT_PER_PROJECT = [
  { name: 'E-Commerce Storefront', percentage: 75, credits: '420.5 credits' },
  { name: 'SaaS Analytics Dashboard', percentage: 55, credits: '310.2 credits' },
  { name: 'AI Persona Chatbot', percentage: 40, credits: '225.0 credits' },
  { name: 'Crypto Portfolio Tracker', percentage: 32, credits: '180.4 credits' },
  { name: 'Team Collaboration Hub', percentage: 24, credits: '135.5 credits' },
  { name: 'Developer Docs Portal', percentage: 18, credits: '102.2 credits' },
];

const RECENT_USAGE_ROWS = [
  { id: 1, project: 'E-Commerce Storefront', mode: 'build', agent: 'coder', credits: '12.4', time: '10 mins ago' },
  { id: 2, project: 'E-Commerce Storefront', mode: 'chat', agent: 'planner', credits: '4.2', time: '25 mins ago' },
  { id: 3, project: 'SaaS Analytics Dashboard', mode: 'build', agent: 'coder', credits: '18.6', time: '2 hours ago' },
  { id: 4, project: 'AI Persona Chatbot', mode: 'chat', agent: 'planner', credits: '3.8', time: '4 hours ago' },
  { id: 5, project: 'Crypto Portfolio Tracker', mode: 'build', agent: 'coder', credits: '8.5', time: '1 day ago' },
  { id: 6, project: 'Team Collaboration Hub', mode: 'chat', agent: 'planner', credits: '2.4', time: '2 days ago' },
];

export default function Usage() {
  return (
    <AppShell title="Usage" description="Your credits and where they were spent">
      <div className="flex flex-col gap-6">
        {/* Row of 4 StatCards: 4 cols on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="Credits left" value="178.6" subtext="Available balance" />

          <StatCard label="Used today" value="42">
            <div className="space-y-1.5 mt-2">
              <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-line">
                <div className="h-full bg-primary-gradient w-[42%]" />
              </div>
              <div className="text-xs text-muted">42 / 100 daily limit</div>
            </div>
          </StatCard>

          <StatCard label="Total credits used" value="1,420.8" subtext="All-time consumption" />
          <StatCard label="Total tokens used" value="8.42M" subtext="All-time throughput" />
        </div>

        {/* Two equal columns: Spent per project & Recent usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Spent per project Card */}
          <div className="bg-card border border-line rounded-2xl p-5 md:p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-4">Spent per project</h2>
            <div className="flex flex-col gap-4">
              {SPENT_PER_PROJECT.map((item) => (
                <div key={item.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-ink truncate max-w-[220px]">{item.name}</span>
                    <span className="text-muted">{item.credits}</span>
                  </div>
                  <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-line">
                    <div className="h-full bg-primary-gradient" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent usage Card */}
          <div className="bg-card border border-line rounded-2xl p-5 md:p-6 shadow-sm overflow-hidden">
            <h2 className="text-base font-semibold text-ink mb-4">Recent usage</h2>

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
                  {RECENT_USAGE_ROWS.map((row) => (
                    <tr key={row.id} className="hover:bg-surface">
                      <td className="py-3 font-medium text-ink truncate max-w-[140px]">{row.project}</td>
                      <td className="py-3">
                        <Badge variant={row.mode === 'build' ? 'purple' : 'primary'}>{row.mode}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={row.agent === 'coder' ? 'success' : 'neutral'}>{row.agent}</Badge>
                      </td>
                      <td className="py-3 font-medium text-ink text-right">{row.credits}</td>
                      <td className="py-3 text-muted text-right">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (md:hidden) */}
            <div className="md:hidden flex flex-col gap-3">
              {RECENT_USAGE_ROWS.map((row) => (
                <div key={row.id} className="p-3.5 rounded-xl border border-line bg-surface flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-ink truncate">{row.project}</span>
                    <span className="text-ink font-semibold">{row.credits} credits</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={row.mode === 'build' ? 'purple' : 'primary'}>{row.mode}</Badge>
                      <Badge variant={row.agent === 'coder' ? 'success' : 'neutral'}>{row.agent}</Badge>
                    </div>
                    <span className="text-muted text-[11px]">{row.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
