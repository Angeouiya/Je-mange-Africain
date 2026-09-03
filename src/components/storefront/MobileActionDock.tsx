"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function MobileActionDock({ testId, children }: { testId: string; children: ReactNode }) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => setPortalReady(true), []);

  if (!portalReady) return null;

  return createPortal(
    <div
      data-testid={testId}
      className="fixed inset-x-0 z-30 border-t border-burgundy/12 bg-white/96 px-3 py-2 shadow-[0_-16px_36px_-28px_rgba(90,38,50,0.7)] backdrop-blur-xl md:hidden"
      style={{ bottom: "calc(3.5rem + max(env(safe-area-inset-bottom), 0.75rem) + 1px)" }}
    >
      {children}
    </div>,
    document.body,
  );
}
