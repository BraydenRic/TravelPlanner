/**
 * GestureRoot — native root view for react-native-gesture-handler.
 * The map's pinch/pan/tap gestures silently never activate without it.
 *
 * Platform-split: GestureRoot.web.tsx is a passthrough, because the web map
 * handles zoom/pan through d3-zoom (react-simple-maps) and importing
 * gesture-handler here would add ~50 KB gz to the web entry bundle.
 */

import React from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export function GestureRoot({ children }: { children: React.ReactNode }) {
  return <GestureHandlerRootView style={styles.root}>{children}</GestureHandlerRootView>
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
