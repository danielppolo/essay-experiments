import Capacitor

class StoryViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(StoryHapticsPlugin())
    }
}
