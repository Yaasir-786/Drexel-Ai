// Landing page: marketing overview with hero, mockup card, how it works, features, and footer
import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Bot,
  Code2,
  Eye,
  FileCode2,
  ImagePlus,
  Download,
  Paperclip,
  Send,
  Moon,
  Coffee,
} from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import Button from "../components/Button";
import Badge from "../components/Badge";

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
            Drexel-Ai turns your idea into a working React app with a Planner
            agent and a Coder agent.
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

        {/* Product mockup: Drexel chat (left) + live preview of the built site (right) */}
        <section className="bg-card border border-line rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Drexel chat panel */}
            <div className="lg:col-span-5 border border-line rounded-xl bg-surface flex flex-col min-h-[460px] overflow-hidden">
              <div className="h-11 border-b border-line bg-card px-4 flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Chat
                </span>
                <Badge variant="purple">Build</Badge>
              </div>

              <div className="flex-1 p-4 flex flex-col gap-4 min-h-0">
                <div className="self-end max-w-[85%] font-serif text-sm rounded-2xl rounded-tr-xs px-4 py-2.5 bg-gradient-to-r from-[#0099FF] to-[#6D5DFC] text-white">
                  build a coffee shop landing page with a menu and an order
                  button
                </div>

                <div className="flex gap-3 self-start max-w-[95%]">
                  <img
                    src="/drexel-logo.svg"
                    alt="Drexel-Ai"
                    draggable={false}
                    className="w-8 h-8 shrink-0"
                  />
                  <div className="min-w-0 pt-1 font-serif text-sm text-ink leading-relaxed">
                    <p>
                      I have built a coffee shop landing page with a hero, menu
                      cards and an order button.
                    </p>
                    <p className="mt-1.5 text-muted">
                      Files: /index.html, /style.css, /script.js
                    </p>
                  </div>
                </div>

                <div className="self-end max-w-[85%] font-serif text-sm rounded-2xl rounded-tr-xs px-4 py-2.5 bg-gradient-to-r from-[#0099FF] to-[#6D5DFC] text-white">
                  make the order button orange and add a dark mode toggle
                </div>

                <div className="flex gap-3 self-start max-w-[95%]">
                  <img
                    src="/drexel-logo.svg"
                    alt="Drexel-Ai"
                    draggable={false}
                    className="w-8 h-8 shrink-0"
                  />
                  <div className="min-w-0 pt-1 font-serif text-sm text-ink leading-relaxed">
                    <p>
                      Done. The button is orange now and the header has a dark
                      mode toggle.
                    </p>
                    <p className="mt-1.5 text-muted">
                      Files: /style.css, /script.js
                    </p>
                  </div>
                </div>
              </div>

              {/* Prompt box like the Builder chat */}
              <div className="p-3 border-t border-line bg-card shrink-0 flex flex-col gap-2">
                <div className="w-full p-2.5 font-serif text-sm rounded-xl border border-line bg-surface text-muted">
                  Describe changes or application to build...
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-line text-muted flex items-center justify-center">
                      <Paperclip size={14} />
                    </div>
                    <div className="flex rounded-xl bg-surface border border-line p-0.5 text-xs font-medium">
                      <span className="px-3 py-1 text-muted">Chat</span>
                      <span className="px-3 py-1 rounded-lg bg-primary-gradient text-white">
                        Build
                      </span>
                    </div>
                  </div>
                  <div className="h-8 px-3 rounded-xl bg-primary-gradient text-white text-xs font-medium inline-flex items-center gap-1.5">
                    <Send size={13} />
                    Send
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Preview panel with the built site */}
            <div className="lg:col-span-7 border border-line rounded-xl bg-card overflow-hidden flex flex-col min-h-[460px]">
              <div className="h-11 border-b border-line bg-card px-4 flex items-center justify-between shrink-0">
                <div className="flex rounded-xl bg-surface border border-line p-0.5 text-xs font-medium">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-card border border-line/60 text-ink font-semibold">
                    <Eye size={14} className="text-[#0099FF]" />
                    Preview
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 text-muted">
                    <Code2 size={14} className="text-purple-500" />
                    Code
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-muted font-mono">
                    Sandbox Live
                  </span>
                </div>
              </div>

              {/* Built site (plain divs) */}
              <div className="flex-1 bg-[#150f0a] text-white flex flex-col">
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Coffee size={16} className="text-orange-400" />
                    Brew &amp; Co
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-white/60">
                    <span className="hidden sm:inline">Menu</span>
                    <span className="hidden sm:inline">About</span>
                    <span className="hidden sm:inline">Contact</span>
                    <span className="p-1.5 rounded-full bg-white/10 text-white">
                      <Moon size={12} />
                    </span>
                  </div>
                </div>

                <div className="px-5 py-8 text-center flex flex-col items-center gap-2">
                  <h4 className="text-xl md:text-2xl font-bold tracking-tight">
                    Fresh coffee, made your way.
                  </h4>
                  <p className="text-[11px] md:text-xs text-white/60 max-w-xs">
                    Small batch roasts, brewed daily and ready when you are.
                  </p>
                  <span className="mt-2 px-4 py-1.5 rounded-lg bg-orange-500 text-xs font-semibold">
                    Order now
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 px-5 pb-5 mt-auto">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2">
                    <div className="h-10 rounded-lg bg-amber-700/40" />
                    <span className="text-xs font-semibold">Espresso</span>
                    <span className="text-[11px] text-orange-400">$3.50</span>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2">
                    <div className="h-10 rounded-lg bg-orange-700/40" />
                    <span className="text-xs font-semibold">Latte</span>
                    <span className="text-[11px] text-orange-400">$4.50</span>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-2">
                    <div className="h-10 rounded-lg bg-stone-600/40" />
                    <span className="text-xs font-semibold">Cold Brew</span>
                    <span className="text-[11px] text-orange-400">$5.00</span>
                  </div>
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
                Breaks down your requirements into actionable architecture and
                component steps.
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
                Synthesizes complete, production-ready React code and tests for
                syntax issues.
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
                Interact with the rendered application immediately and export
                clean source files.
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
              <h3 className="text-base font-semibold text-ink">
                Chat and Build modes
              </h3>
              <p className="text-sm text-muted">
                Switch seamlessly between conversational planning and direct
                code editing.
              </p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <Code2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">
                Live code streaming
              </h3>
              <p className="text-sm text-muted">
                Watch file generation stream line by line with realtime status
                badges.
              </p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <FileCode2 size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">
                File tree and code editor
              </h3>
              <p className="text-sm text-muted">
                Browse directory hierarchy and modify code directly in the
                integrated editor.
              </p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <Eye size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">Live preview</h3>
              <p className="text-sm text-muted">
                Test the interactive user interface rendered right inside your
                browser window.
              </p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <ImagePlus size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">
                Image generation and editing
              </h3>
              <p className="text-sm text-muted">
                Generate images right in the chat, then edit or download them in
                one click.
              </p>
            </div>

            <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-2">
              <div className="text-[#0099FF] mb-1">
                <Download size={20} />
              </div>
              <h3 className="text-base font-semibold text-ink">ZIP download</h3>
              <p className="text-sm text-muted">
                Export self-contained Vite and React projects ready for
                deployment.
              </p>
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
