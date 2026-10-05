import { Capacitor, registerPlugin } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export type StoryHaptic = 'collision' | 'reflection' | 'ending'

interface StoryHapticsPlugin {
  play(options: { kind: StoryHaptic }): Promise<{ played: boolean }>
  type(options: { count: number; intensity: number; sharpness: number }): Promise<{ played: boolean }>
  draw(options: { intensity: number; sharpness: number }): Promise<{ played: boolean }>
  stopDrawing(): Promise<void>
}

const StoryHaptics = registerPlugin<StoryHapticsPlugin>('StoryHaptics')

export function hasNativeHaptics() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

export async function typeStoryCharacters(count: number, intensity: number, sharpness: number) {
  if (!hasNativeHaptics() || count <= 0) return
  try {
    await StoryHaptics.type({ count, intensity, sharpness })
  } catch {
    // Letter-level feedback is optional when Core Haptics is unavailable.
  }
}

export async function drawStoryGraphite(intensity: number, sharpness: number) {
  if (!hasNativeHaptics()) return
  try {
    await StoryHaptics.draw({ intensity, sharpness })
  } catch {
    // Keep the canvas responsive even if the haptic engine is interrupted.
  }
}

export async function stopStoryGraphite() {
  if (!hasNativeHaptics()) return
  try {
    await StoryHaptics.stopDrawing()
  } catch {
    // The visual story never depends on haptic playback.
  }
}

export async function playStoryHaptic(kind: StoryHaptic) {
  if (!hasNativeHaptics()) return

  try {
    const result = await StoryHaptics.play({ kind })
    if (result.played) return
  } catch {
    // The standard plugin remains usable if the custom Core Haptics bridge fails.
  }

  try {
    await Haptics.impact({
      style: kind === 'ending' ? ImpactStyle.Heavy : ImpactStyle.Medium,
    })
  } catch {
    // A device without haptic hardware still gets the complete visual story.
  }
}
