// Landing page: marketing overview with hero, mockup card, how it works, features, and footer
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Code2,
  Eye,
  FileCode2,
  FolderGit2,
  Download,
  CheckCircle,
} from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/Button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-page text-ink relative overflow-hidden flex flex-col">
      {/* Soft pastel blurred gradient background circles */}
      <div
        className="absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-96 right-10 w-[450px] h-[450px] rounded-full bg-purple-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Navbar */}
      <header className="border-b border-line bg-card/70 sticky top-0 z-30">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1120px] mx-auto px-4 md:px-6 py-12 md:py-20 flex flex-col gap-16 md:gap-24 relative z-10 w-full">
        {/* Hero Section */}
        <section className="text-center flex flex-col items-center gap-6 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-ink leading-tight">
            Describe it. Chat. Build.
          </h1>
          <p className="text-lg md:text-xl text-muted leading-relaxed">
            Drexel-Ai turns your idea into a working React app with a Planner agent and a Coder agent.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/signup">
              <Button variant="primary" className="px-6 text-base">
                Get started free
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="px-6 text-base">
                Log in
              </Button>
            </Link>
          </div>
        </section>

        {/* Large Product Mockup Card (plain divs) */}
        <section className="bg-card border border-line rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Chat Bubbles */}
            <div className="lg:col-span-5 border border-line rounded-xl bg-surface p-4 flex flex-col gap-3">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Bot size={16} className="text-[#0099FF]" />
                Agent Conversation
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-ink">
                <span className="font-semibold text-[#0099FF] block mb-1">Planner Agent</span>
                Architected 4 components and setup standard navigation routes.
              </div>
              <div className="bg-[#0099FF] text-white rounded-xl p-3 text-xs self-end max-w-[85%]">
                Add a dark mode toggle button in the header.
              </div>
              <div className="bg-card border border-line rounded-xl p-3 text-xs text-ink">
                <span className="font-semibold text-purple-600 dark:text-purple-400 block mb-1">Coder Agent</span>
                Created ThemeToggle component and applied theme variables.
              </div>
            </div>

            {/* Right: Browser Frame with simple placeholder blocks */}
            <div className="lg:col-span-7 border border-line rounded-xl bg-card overflow-hidden flex flex-col">
              <div className="h-9 bg-surface border-b border-line px-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div className="ml-2 px-3 py-0.5 rounded-md bg-card border border-line text-[11px] text-muted flex-1 text-center font-mono">
                  localhost:5173/preview
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="h-8 bg-surface rounded-lg w-1/3 border border-line" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-20 bg-surface rounded-xl border border-line p-3 flex flex-col justify-between">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20" />
                    <div className="h-2 bg-line rounded w-3/4" />
                  </div>
                  <div className="h-20 bg-surface rounded-xl border border-line p-3 flex flex-col justify-between">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20" />
                    <div className="h-2 bg-line rounded w-2/3" />
                  </div>
                  <div className="h-20 bg-surface rounded-xl border border-line p-3 flex flex-col justify-between">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20" />
                    <div className="h-2 bg-line rounded w-1/2" />
                  </div>
                </div>
                <div className="h-32 bg-surface rounded-xl border border-line p-4 flex flex-col gap-2">
                  <div className="h-3 bg-line rounded w-1/4" />
                  <div className="h-2 bg-line rounded w-full" />
                  <div className="h-2 bg-line rounded w-5/6" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: How it works */}
        <section className="flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-ink">
              How it works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0099FF] flex items-center justify-center border border-blue-200 dark:border-blue-900">
                <Bot size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">
                Planner Agent plans your project
              </h3>
              <p className="text-sm text-muted">
                Breaks down your requirements into actionable architecture and component steps.
              </p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-900">
                <Code2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">
                Coder Agent writes, reviews and fixes the code
              </h3>
              <p className="text-sm text-muted">
                Synthesizes complete, production-ready React code and tests for syntax issues.
              </p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-900">
                <Eye size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">
                See live preview and download the ZIP
              </h3>
              <p className="text-sm text-muted">
                Interact with the rendered application immediately and export clean source files.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Features */}
        <section className="flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-ink">
              Features
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <Sparkles size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">Chat and Build modes</h3>
              <p className="text-sm text-muted">Switch seamlessly between conversational planning and direct code editing.</p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <Code2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">Live code streaming</h3>
              <p className="text-sm text-muted">Watch file generation stream line by line with realtime status badges.</p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <FileCode2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">File tree and code editor</h3>
              <p className="text-sm text-muted">Browse directory hierarchy and modify code directly in the integrated editor.</p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <Eye size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">Live preview</h3>
              <p className="text-sm text-muted">Test the interactive user interface rendered right inside your browser window.</p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <FolderGit2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">Version history</h3>
              <p className="text-sm text-muted">Restore your code repository to any prior checkpoint with one click.</p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <Download size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">ZIP download</h3>
              <p className="text-sm text-muted">Export self-contained Vite and React projects ready for deployment.</p>
            </div>
          </div>
        </section>

        {/* Final CTA Block */}
        <section className="bg-card border border-line rounded-2xl p-8 md:p-12 text-center flex flex-col items-center gap-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-ink">
            Ready to build your next app in minutes?
          </h2>
          <p className="text-muted text-base max-w-lg">
            Start building with Drexel-Ai today.
          </p>
          <Link to="/signup" className="pt-2">
            <Button variant="primary" className="px-6">
              Get started free
            </Button>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-card mt-auto">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between text-sm text-muted">
          <Logo size="small" />
          <span>© Drexel-Ai</span>
        </div>
      </footer>
    </div>
  );
}
