/**
 * EmptyState — Custom empty state with unique SVG illustrations per type.
 * Staggered fade-in + idle floating animation.
 */

import React, { memo, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated'
import Svg, { Path, Circle, Ellipse, Line, G } from 'react-native-svg'
import { colors } from '@theme/colors'
import { spacing } from '@theme/spacing'
import { fontFamily, fontSize } from '@theme/typography'
import { springs, duration } from '@theme/animations'
import { SpringButton } from '@components/ui/SpringButton'

export type EmptyStateType = 'been' | 'want' | 'lived' | 'groups' | 'explore'

interface EmptyStateProps {
  type: EmptyStateType
  onActionPress: () => void
  actionLabel: string
}

interface EmptyConfig {
  title: string
  description: string
  IllustrationComponent: React.ComponentType<{ floatY: number }>
}

// Illustration: globe with dotted flight paths + scattered pins
function BeenIllustration({ floatY: _floatY }: { floatY: number }) {
  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* Ocean background circle */}
      <Circle cx={100} cy={100} r={70} fill="rgba(0,245,212,0.05)" stroke="rgba(0,245,212,0.2)" strokeWidth={1} />

      {/* Latitude lines */}
      <Ellipse cx={100} cy={100} rx={70} ry={25} fill="none" stroke="rgba(0,245,212,0.1)" strokeWidth={0.8} />
      <Ellipse cx={100} cy={100} rx={70} ry={50} fill="none" stroke="rgba(0,245,212,0.08)" strokeWidth={0.8} />

      {/* Longitude line */}
      <Path d="M100 30 C115 55 115 145 100 170" fill="none" stroke="rgba(0,245,212,0.1)" strokeWidth={0.8} />
      <Path d="M100 30 C85 55 85 145 100 170" fill="none" stroke="rgba(0,245,212,0.1)" strokeWidth={0.8} />

      {/* Dotted flight paths */}
      <Path d="M60 80 Q90 60 130 75" fill="none" stroke={colors.accentTeal} strokeWidth={1.5} strokeDasharray="3,4" opacity={0.6} />
      <Path d="M75 120 Q100 95 145 110" fill="none" stroke={colors.accentAmber} strokeWidth={1.5} strokeDasharray="3,4" opacity={0.5} />

      {/* City pins */}
      <Circle cx={60} cy={80} r={4} fill={colors.accentTeal} />
      <Circle cx={130} cy={75} r={4} fill={colors.accentTeal} />
      <Circle cx={75} cy={120} r={4} fill={colors.accentAmber} />
      <Circle cx={145} cy={110} r={4} fill={colors.accentViolet} />
      <Circle cx={90} cy={145} r={3} fill={colors.accentTeal} opacity={0.6} />
    </Svg>
  )
}

// Illustration: compass with glowing needle → star
function WantIllustration({ floatY: _floatY }: { floatY: number }) {
  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* Outer compass ring */}
      <Circle cx={100} cy={100} r={65} fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth={1.5} />
      <Circle cx={100} cy={100} r={55} fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth={1} />

      {/* N/S/E/W ticks */}
      <Line x1={100} y1={35} x2={100} y2={45} stroke="rgba(167,139,250,0.5)" strokeWidth={2} strokeLinecap="round" />
      <Line x1={100} y1={155} x2={100} y2={165} stroke="rgba(167,139,250,0.3)" strokeWidth={2} strokeLinecap="round" />
      <Line x1={35} y1={100} x2={45} y2={100} stroke="rgba(167,139,250,0.3)" strokeWidth={2} strokeLinecap="round" />
      <Line x1={155} y1={100} x2={165} y2={100} stroke="rgba(167,139,250,0.3)" strokeWidth={2} strokeLinecap="round" />

      {/* Compass needle pointing to star */}
      <Path d="M100 100 L112 60" stroke={colors.accentViolet} strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
      <Path d="M100 100 L88 140" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeLinecap="round" />

      {/* Glowing star at destination */}
      <Path d="M112 48 L113.5 53 L119 53.5 L114.5 57 L116 62 L112 59 L108 62 L109.5 57 L105 53.5 L110.5 53 Z"
        fill={colors.accentViolet} opacity={0.9} />

      {/* Center pivot */}
      <Circle cx={100} cy={100} r={5} fill={colors.accentViolet} opacity={0.8} />
      <Circle cx={100} cy={100} r={2} fill={colors.bgL0} />
    </Svg>
  )
}

// Illustration: stylized house with world map silhouette inside
function LivedIllustration({ floatY: _floatY }: { floatY: number }) {
  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* House outline */}
      <Path d="M40 170 L40 100 L100 50 L160 100 L160 170 Z" fill="rgba(245,166,35,0.08)" stroke="rgba(245,166,35,0.3)" strokeWidth={1.5} />
      {/* Roof */}
      <Path d="M35 105 L100 45 L165 105" fill="none" stroke={colors.accentAmber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Door */}
      <Path d="M85 170 L85 140 C85 136 88 134 92 134 L108 134 C112 134 115 136 115 140 L115 170" fill="rgba(245,166,35,0.15)" stroke="rgba(245,166,35,0.4)" strokeWidth={1} />

      {/* World map silhouette inside window */}
      <Circle cx={100} cy={110} r={20} fill="rgba(245,166,35,0.1)" stroke="rgba(245,166,35,0.2)" strokeWidth={1} />
      <Path d="M85 110 C88 106 92 104 100 104 C108 104 112 106 115 110 C112 114 108 116 100 116 C92 116 88 114 85 110 Z" fill="rgba(245,166,35,0.25)" />
    </Svg>
  )
}

// Illustration: constellation of connected dots
function GroupsIllustration({ floatY: _floatY }: { floatY: number }) {
  const nodes = [
    { x: 100, y: 70 },
    { x: 60, y: 110 },
    { x: 140, y: 110 },
    { x: 75, y: 150 },
    { x: 125, y: 150 },
    { x: 100, y: 130 },
  ]

  const edges: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [3, 5], [4, 5],
  ]

  const memberColors = [
    colors.accentTeal,
    colors.accentAmber,
    colors.accentViolet,
    colors.accentCoral,
    colors.accentTeal,
    colors.accentAmber,
  ]

  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {edges.map(([a, b], i) => (
        <Line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}
      {nodes.map((node, i) => (
        <G key={i}>
          <Circle cx={node.x} cy={node.y} r={10} fill={`${memberColors[i]}20`} />
          <Circle cx={node.x} cy={node.y} r={6} fill={memberColors[i]} opacity={0.8} />
        </G>
      ))}
    </Svg>
  )
}

// Illustration: compass + discovery (shared with explore)
function ExploreIllustration({ floatY: _floatY }: { floatY: number }) {
  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* Binocular circles */}
      <Circle cx={80} cy={105} r={32} fill="rgba(0,245,212,0.06)" stroke="rgba(0,245,212,0.25)" strokeWidth={2} />
      <Circle cx={120} cy={105} r={32} fill="rgba(0,245,212,0.06)" stroke="rgba(0,245,212,0.25)" strokeWidth={2} />
      {/* Bridge */}
      <Path d="M90 98 L110 98" stroke="rgba(0,245,212,0.4)" strokeWidth={3} strokeLinecap="round" />

      {/* Glare dots */}
      <Circle cx={70} cy={94} r={4} fill="rgba(255,255,255,0.15)" />
      <Circle cx={110} cy={94} r={4} fill="rgba(255,255,255,0.15)" />

      {/* Discovery star */}
      <Path d="M100 55 L101.5 60 L107 60.5 L102.5 64 L104 69 L100 66.5 L96 69 L97.5 64 L93 60.5 L98.5 60 Z"
        fill={colors.accentTeal} opacity={0.7} />
    </Svg>
  )
}

const EMPTY_CONFIGS: Record<EmptyStateType, EmptyConfig> = {
  been: {
    title: 'Start Your Journey',
    description: 'Mark countries you\'ve visited and rate your experiences.',
    IllustrationComponent: BeenIllustration,
  },
  want: {
    title: 'Dream Big',
    description: 'Add countries to your travel wishlist.',
    IllustrationComponent: WantIllustration,
  },
  lived: {
    title: 'Places Called Home',
    description: 'Mark countries where you\'ve lived for a meaningful period.',
    IllustrationComponent: LivedIllustration,
  },
  groups: {
    title: 'Travel Together',
    description: 'Create or join a group to compare travel maps with friends.',
    IllustrationComponent: GroupsIllustration,
  },
  explore: {
    title: 'Explore the World',
    description: 'Discover countries and find your next destination.',
    IllustrationComponent: ExploreIllustration,
  },
}

function EmptyStateInner({ type, onActionPress, actionLabel }: EmptyStateProps) {
  const config = EMPTY_CONFIGS[type]
  const IllustrationComponent = config.IllustrationComponent

  const illusOpacity = useSharedValue(0)
  const illusScale = useSharedValue(0.9)
  const titleOpacity = useSharedValue(0)
  const titleY = useSharedValue(8)
  const descOpacity = useSharedValue(0)
  const btnOpacity = useSharedValue(0)
  const floatY = useSharedValue(0)

  useEffect(() => {
    // Staggered entrance
    illusOpacity.value = withDelay(50, withSpring(1, springs.standard))
    illusScale.value = withDelay(50, withSpring(1, springs.gentle))
    titleOpacity.value = withDelay(200, withSpring(1, springs.standard))
    titleY.value = withDelay(200, withSpring(0, springs.standard))
    descOpacity.value = withDelay(320, withSpring(1, springs.standard))
    btnOpacity.value = withDelay(440, withSpring(1, springs.standard))

    // Idle float
    floatY.value = withRepeat(
      withTiming(-8, { duration: duration.verySlow + 600 }),
      -1,
      true,
    )

    return () => {
      floatY.value = 0
    }
  }, [
    illusOpacity, illusScale, titleOpacity, titleY,
    descOpacity, btnOpacity, floatY,
  ])

  const illusStyle = useAnimatedStyle(() => ({
    opacity: illusOpacity.value,
    transform: [
      { scale: illusScale.value },
      { translateY: floatY.value },
    ],
  }))

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }))

  const descStyle = useAnimatedStyle(() => ({
    opacity: descOpacity.value,
  }))

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
  }))

  return (
    <View style={styles.container}>
      <Animated.View style={illusStyle}>
        <IllustrationComponent floatY={0} />
      </Animated.View>

      <Animated.Text style={[styles.title, titleStyle]}>
        {config.title}
      </Animated.Text>

      <Animated.Text style={[styles.description, descStyle]}>
        {config.description}
      </Animated.Text>

      <Animated.View style={btnStyle}>
        <SpringButton variant="primary" onPress={onActionPress}>
          {actionLabel}
        </SpringButton>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.bgL0,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
})

export const EmptyState = memo(EmptyStateInner)
