# iOS haptic edition

The iOS app bundles the existing `/sol-brush-story` web drawing in Capacitor. It does **not** reimplement the canvas renderer in Swift. A local native plugin receives character counts, drawing pressure, and named story events and plays Core Haptics patterns. The standard Capacitor Haptics plugin is a fallback for the discrete collision/reflection/ending cues.

## Build and run

Requirements: a Mac with Xcode 26 or newer, Node 22 or newer, and a physical iPhone for haptic testing.

```sh
npm install
npm run ios:sync
npm run ios:open
```

In Xcode, select the `App` target, choose your signing team, connect an iPhone, and run. The bundle ID is provisionally `com.danielppolo.essayexperiments`; change it in `capacitor.config.ts` and Xcode before distributing if that identifier is not yours. The generated icon and splash screen are placeholders.

`ios:sync` makes a static Next.js export, copies it into the native app, and updates native dependencies. Run it after every web-code change you want on the device. Normal `npm run dev` and `npm run build` remain unchanged; the static export is enabled only for `ios:build`. The native app starts from the bundled `/sol-brush-story/index.html` and does not need the development server. The final date is formatted at runtime on the device rather than frozen on build day.

## Haptic score

`src/components/sol-brush-story.tsx` compares the previous and current normalized scroll positions. Every character newly revealed by the greeting, paragraphs, farewell, or date generates a light transient pulse; if one scroll update reveals several characters, the bridge sends their count in one call and Swift spaces the individual pulses. A very fast flick compresses their timing, so distinct sensations may merge rather than queue for seconds. Backward scrolling untypes the visual scene without replaying character haptics.

During the initial grid drawing and each brush-line/reflection window, forward motion starts a low continuous Core Haptics event. Scroll speed controls its pressure; two progress-based waves introduce subtle, reproducible grain rather than random vibration. Updates are rate-limited to about 28 per second, and the event stops after 110 ms without forward progress, on reverse scroll, on leaving the line window, or when the page is hidden. The **Haptics on/off** button and **Feel** panel appear only in the native iOS app. The panel exposes letter strength, graphite strength, paper grain, and edge sharpness; values are session-only.

| Event | Meaning | Native pattern |
| --- | --- | --- |
| `type` | Every newly visible character, including spaces and punctuation | Small, moderately crisp tap |
| `draw` | Forward progress in a grid/brush-line window | Low continuous contact modulated by speed and grain |
| `collision` | A line meets a text boundary | Stronger, rounded tap |
| `reflection` | The line turns away after the text leaves | Two brief, sharper taps |
| `ending` | The final scroll position is reached | Moderate, soft tap |

`src/lib/story-haptics.ts` is the typed web-to-native boundary. `ios/App/App/StoryHapticsPlugin.swift` implements the patterns, and `StoryViewController.swift` registers the plugin. The Swift implementation checks `CHHapticEngine.capabilitiesForHardware().supportsHaptics`; if it cannot play, discrete named cues fall back to `@capacitor/haptics`, while character and graphite textures fail quietly. On devices without haptic hardware, the visual story continues normally.

The iOS simulator can confirm that the app loads and compiles, but it cannot verify tactile quality. Tune intensity and sharpness on a physical iPhone, particularly while flicking quickly, scrolling backward, and toggling haptics off. Test the story at several text sizes and device orientations before release.
