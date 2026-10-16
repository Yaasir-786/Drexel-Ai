// AppShell layout for authenticated pages (Projects, Usage, Settings, Admin)
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Drawer from '../Drawer';

export default function AppShell({
  title,
  description,
  actionButton,
  children,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page text-ink flex">
      {/* Desktop Fixed Sidebar (1024px and up) */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[264px] z-40">
        <Sidebar />
      </div>

      {/* Mobile / Tablet Drawer Sidebar (below 1024px) */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        position="left"
        width="w-[280px]"
      >
        <div className="h-full -m-5">
          <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
        </div>
      </Drawer>

      {/* Main content wrapper (offset by sidebar width on desktop) */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-w-0">
        <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Page Content Container: max width 1120px, left-aligned */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-[1120px]">
          {/* Standard Page Header */}
          {title && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
              <div>
                <h1 className="text-[28px] font-semibold text-ink tracking-tight leading-tight">
                  {title}
                </h1>
                {description && (
                  <p className="text-sm text-muted mt-1 leading-normal">
                    {description}
                  </p>
                )}
              </div>
              {actionButton && (
                <div className="shrink-0 self-start sm:self-auto">
                  {actionButton}
                </div>
              )}
            </div>
          )}

          {/* Child content */}
          {children}
        </main>
      </div>
    </div>
  );
}
