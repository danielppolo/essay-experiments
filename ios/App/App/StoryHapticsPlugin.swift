import Capacitor
import CoreHaptics

@objc(StoryHapticsPlugin)
public class StoryHapticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoryHapticsPlugin"
    public let jsName = "StoryHaptics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "type", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "draw", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopDrawing", returnType: CAPPluginReturnPromise)
    ]

    private var engine: CHHapticEngine?
    private var graphitePlayer: CHHapticAdvancedPatternPlayer?

    override public func load() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        engine = try? CHHapticEngine()
        engine?.isAutoShutdownEnabled = true
        engine?.resetHandler = { [weak self] in
            // Players are invalid after a media-server reset; the next draw recreates one.
            self?.graphitePlayer = nil
        }
    }

    @objc public func play(_ call: CAPPluginCall) {
        let events: [CHHapticEvent]
        switch call.getString("kind") {
        case "collision":
            events = [tap(intensity: 0.65, sharpness: 0.32, at: 0)]
        case "reflection":
            events = [
                tap(intensity: 0.46, sharpness: 0.78, at: 0),
                tap(intensity: 0.25, sharpness: 0.68, at: 0.075)
            ]
        case "ending":
            events = [tap(intensity: 0.42, sharpness: 0.22, at: 0)]
        default:
            call.reject("Unknown haptic event")
            return
        }
        play(events, call: call)
    }

    @objc public func type(_ call: CAPPluginCall) {
        // One scroll frame can reveal several characters; retain each pulse without a long queue.
        let count = min(max(call.getInt("count") ?? 0, 0), 512)
        guard count > 0 else { call.resolve(["played": false]); return }
        let strength = unit(call.getDouble("intensity") ?? 0.24)
        let sharpness = unit(call.getDouble("sharpness") ?? 0.48)
        let spacing = max(0.004, min(0.034, 0.32 / Double(count)))
        let events = (0..<count).map { index in
            tap(intensity: Float(strength), sharpness: Float(sharpness), at: Double(index) * spacing)
        }
        play(events, call: call)
    }

    @objc public func draw(_ call: CAPPluginCall) {
        guard let engine else { call.resolve(["played": false]); return }
        let intensity = unit(call.getDouble("intensity") ?? 0)
        let sharpness = unit(call.getDouble("sharpness") ?? 0.24)
        do {
            try engine.start()
            if graphitePlayer == nil {
                // Rounded contact; scroll-driven intensity changes supply the paper grain.
                let contact = CHHapticEvent(
                    eventType: .hapticContinuous,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.42),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.24)
                    ],
                    relativeTime: 0,
                    duration: 1
                )
                let pattern = try CHHapticPattern(events: [contact], parameters: [])
                graphitePlayer = try engine.makeAdvancedPlayer(with: pattern)
                graphitePlayer?.loopEnabled = true
                graphitePlayer?.loopEnd = 1
                try graphitePlayer?.start(atTime: 0)
            }
            try graphitePlayer?.sendParameters([
                CHHapticDynamicParameter(parameterID: .hapticIntensityControl, value: Float(intensity), relativeTime: 0),
                CHHapticDynamicParameter(parameterID: .hapticSharpnessControl, value: Float(sharpness - 0.24), relativeTime: 0)
            ], atTime: 0)
            call.resolve(["played": true])
        } catch {
            graphitePlayer = nil
            call.reject("Core Haptics could not draw", nil, error)
        }
    }

    @objc public func stopDrawing(_ call: CAPPluginCall) {
        do {
            try graphitePlayer?.stop(atTime: 0)
            graphitePlayer = nil
            call.resolve()
        } catch {
            graphitePlayer = nil
            call.reject("Core Haptics could not stop drawing", nil, error)
        }
    }

    private func play(_ events: [CHHapticEvent], call: CAPPluginCall) {
        guard let engine else { call.resolve(["played": false]); return }
        do {
            try engine.start()
            let pattern = try CHHapticPattern(events: events, parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: 0)
            call.resolve(["played": true])
        } catch {
            call.reject("Core Haptics could not play", nil, error)
        }
    }

    private func tap(intensity: Float, sharpness: Float, at time: TimeInterval) -> CHHapticEvent {
        CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
            ],
            relativeTime: time
        )
    }

    private func unit(_ value: Double) -> Double { min(1, max(0, value)) }
}
