/**
 * Login screen — full-bleed dark, animated globe, Google sign-in.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native'
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated'
import Svg, { Circle, Path, Line } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'
import { signInWithGoogle } from '@lib/auth'
import { useUIStore } from '@stores/uiStore'
import { colors } from '@theme/colors'
import { borderRadius, spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs } from '@theme/animations'

const { width: W, height: H } = Dimensions.get('window')
const NUM_STARS = 60

function StarField() {
  const stars = React.useMemo(
    () =>
      Array.from({ length: NUM_STARS }, (_, i) => ({
        id: i,
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 3000,
      })),
    [],
  )

  return (
    <Svg
      width={W}
      height={H}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {stars.map((s) => (
        <Circle key={s.id} cx={s.x} cy={s.y} r={s.size} fill="rgba(255,255,255,0.5)" />
      ))}
    </Svg>
  )
}

function AnimatedGlobe() {
  const rotation = useSharedValue(0)

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 60000 }),
      -1,
      false,
    )
    return () => {
      rotation.value = 0
    }
  }, [rotation])

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <Animated.View style={[styles.globeContainer, rotateStyle]}>
      <Svg width={280} height={280} viewBox="0 0 280 280">
        <Circle cx={140} cy={140} r={110} fill="rgba(0,245,212,0.04)" stroke="rgba(0,245,212,0.12)" strokeWidth={1} />
        <Circle cx={140} cy={140} r={80} fill="none" stroke="rgba(0,245,212,0.06)" strokeWidth={0.8} />
        {/* Latitude bands */}
        {[0.3, 0.5, 0.7].map((r, i) => (
          <Path
            key={i}
            d={`M ${140 - 110 * r} 140 A ${110 * r} ${110 * r * 0.3} 0 0 1 ${140 + 110 * r} 140 A ${110 * r} ${110 * r * 0.3} 0 0 1 ${140 - 110 * r} 140`}
            fill="none"
            stroke="rgba(0,245,212,0.06)"
            strokeWidth={0.8}
          />
        ))}
        {/* Longitude lines */}
        {[0, 45, 90, 135].map((angle, i) => (
          <Line2
            key={i}
            angle={angle}
            cx={140}
            cy={140}
            r={110}
          />
        ))}
        {/* Continent blobs */}
        <Path d="M120 100 C130 85 160 90 165 110 C170 130 155 140 140 135 C125 130 110 115 120 100 Z" fill="rgba(0,245,212,0.12)" />
        <Path d="M80 130 C85 118 100 120 105 135 C108 148 95 155 85 148 C75 141 75 142 80 130 Z" fill="rgba(0,245,212,0.08)" />
        <Path d="M155 145 C165 140 178 148 175 162 C172 175 158 178 150 168 C142 158 145 150 155 145 Z" fill="rgba(0,245,212,0.08)" />
      </Svg>
    </Animated.View>
  )
}

function Line2({ angle, cx, cy, r }: { angle: number; cx: number; cy: number; r: number }) {
  const rad = (angle * Math.PI) / 180
  const x1 = cx + r * Math.cos(rad)
  const y1 = cy + r * Math.sin(rad)
  const x2 = cx - r * Math.cos(rad)
  const y2 = cy - r * Math.sin(rad)
  return (
    <Line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="rgba(0,245,212,0.06)"
      strokeWidth={0.8}
    />
  )
}

// Google logo SVG (simplified)
function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  )
}

export default function LoginScreen() {
  const { addToast } = useUIStore()
  const router = useRouter()
  // Inline notice under the buttons — toasts have no host component yet, so
  // feedback must render here or the user sees nothing happen.
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  const contentOpacity = useSharedValue(0)
  const contentY = useSharedValue(30)

  useEffect(() => {
    contentOpacity.value = withDelay(300, withSpring(1, springs.standard))
    contentY.value = withDelay(300, withSpring(0, springs.gentle))
    return () => {
      contentOpacity.value = 0
      contentY.value = 30
    }
  }, [contentOpacity, contentY])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  const handleGoogleSignIn = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setNotice(null)
    setSigningIn(true)
    signInWithGoogle()
      .then((signedIn) => {
        // On web the page redirects away, so only native reaches this branch
        // with a live session — route past the auth guard ourselves.
        if (signedIn && Platform.OS !== 'web') router.replace('/(tabs)/map')
      })
      .catch(() => {
        addToast({ message: 'Sign-in failed. Please try again.', type: 'error' })
        setNotice({ text: 'Sign-in failed. Please try again.', isError: true })
      })
      .finally(() => setSigningIn(false))
  }, [addToast, router])

  return (
    <View style={styles.container}>
      {/* Starfield background */}
      <StarField />

      {/* Animated globe (background element) */}
      <View style={styles.globeBackground} pointerEvents="none">
        <AnimatedGlobe />
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, contentStyle]}>
        {/* Logo */}
        <View style={styles.logoBlock}>
          <Text style={styles.logoText}>Driftmark</Text>
          <Text style={styles.tagline}>Your world, mapped.</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={signingIn}
            style={[styles.googleButton, signingIn && styles.googleButtonBusy]}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
          >
            <GoogleLogo />
            <Text style={styles.googleText}>
              {signingIn ? 'Signing in…' : 'Continue with Google'}
            </Text>
          </Pressable>

          {notice && (
            <Text style={[styles.notice, notice.isError && styles.noticeError]}>
              {notice.text}
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgL0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeBackground: {
    position: 'absolute',
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeContainer: {
    width: 280,
    height: 280,
  },
  content: {
    alignItems: 'center',
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  logoBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoText: {
    fontFamily: fontFamily.heading,
    fontSize: 52,
    color: colors.textPrimary,
    letterSpacing: -2,
  },
  tagline: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  googleButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.sm + 2,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  googleText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  googleButtonBusy: {
    opacity: 0.6,
  },
  notice: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noticeError: {
    color: colors.danger,
  },
})
