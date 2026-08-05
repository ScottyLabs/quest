import Capacitor
import UIKit
import os

private let log = Logger(subsystem: "org.scottylabs.quest", category: "boot")

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let publicDir = Bundle.main.url(forResource: "public", withExtension: nil)
        let config = Bundle.main.url(forResource: "capacitor.config", withExtension: "json")
        log.notice("boot: public=\(publicDir?.path ?? "MISSING") config=\(config?.path ?? "MISSING")")

        pokeDevServer()

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = .white
        let bridge = CAPBridgeViewController()
        window.rootViewController = bridge
        window.makeKeyAndVisible()
        self.window = window

        log.notice("boot: window=\(NSCoder.string(for: window.frame)) rootView=\(String(describing: type(of: bridge.view)))")
        return true
    }

    private func pokeDevServer() {
        guard
            let url = Bundle.main.url(forResource: "capacitor.config", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let server = root["server"] as? [String: Any],
            let raw = server["url"] as? String,
            let dev = URL(string: raw)
        else { return }

        var request = URLRequest(url: dev)
        request.timeoutInterval = 5
        URLSession.shared.dataTask(with: request).resume()
    }

    // plugins only see URL opens and universal links through this proxy
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }
}
