/**
 * GestureRoot (web) — passthrough. The web map handles zoom/pan through
 * d3-zoom (react-simple-maps), so mounting gesture-handler's root view here
 * would only add ~50 KB gz of dead weight to the entry bundle.
 */

import React from 'react'

export function GestureRoot({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
