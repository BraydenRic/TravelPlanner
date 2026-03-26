/**
 * React Error Boundary — Driftmark
 *
 * Catches unhandled React rendering errors and displays a recovery UI
 * instead of crashing the entire app.
 *
 * Security note: In production builds, error details are never shown to
 * the user — only a generic message. This prevents information disclosure
 * (stack traces, file paths, internal state) that could assist an attacker.
 * In development (__DEV__), full error messages are shown for debugging.
 *
 * See THREAT_MODEL.md AS-07 (error message information disclosure).
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'

interface Props {
  children: ReactNode
  /** Optional custom fallback UI. If provided, replaces the default error screen. */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // In production, errors should be sent to a monitoring service
    // (e.g., Sentry) rather than logged to the console.
    // Console output in production builds is readable by anyone with
    // developer tools — never log PII or sensitive data here.
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, errorInfo)
    }
    // TODO: integrate with monitoring service (Sentry, Bugsnag, etc.)
    // monitoringService.captureException(error, { extra: errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {/* Never show error details to users in production */}
            {__DEV__ ? this.state.error?.message : 'Please try again.'}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgL0,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.accentTeal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: colors.bgL0,
    fontWeight: '600',
    fontSize: 16,
  },
})
