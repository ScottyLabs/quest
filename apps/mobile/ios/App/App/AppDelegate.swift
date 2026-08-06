import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // iOS only raises the local-network permission prompt for a NATIVE
        // connection to a private address; a WKWebView fetch() to a LAN IP is
        // just denied in silence. So ask at boot, before any JS runs - without
        // this every request to a dev backend fails and the UI looks inert.
        // (The xtool target has always done this; the Xcode target did not,
        // which is why sign-in worked there and nowhere else.)
        pokeLocalNetwork()

        // Built without storyboards: Main.storyboard used to instantiate this
        // controller and LaunchScreen.storyboard drew the splash. Compiling
        // either needs `ibtool`, which renders through the WindowServer and so
        // hangs forever in an ssh session - see scripts/ios-remote. The launch
        // screen now comes from the UILaunchScreen key in Info.plist.
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = CAPBridgeViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }

    /// Touch every locally-hosted URL the app is configured against: the live
    /// reload server (`server.url`) and the API base, which `cap sync` copies
    /// into `plugins.Quest.apiBase`. Responses are irrelevant - the connection
    /// attempt is what makes iOS ask.
    private func pokeLocalNetwork() {
        guard
            let url = Bundle.main.url(forResource: "capacitor.config", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return }

        var targets: [String] = []
        if let server = root["server"] as? [String: Any], let raw = server["url"] as? String {
            targets.append(raw)
        }
        if let plugins = root["plugins"] as? [String: Any],
            let quest = plugins["Quest"] as? [String: Any],
            let raw = quest["apiBase"] as? String {
            targets.append(raw)
        }

        for raw in targets {
            guard let target = URL(string: raw) else { continue }
            var request = URLRequest(url: target)
            request.timeoutInterval = 5
            URLSession.shared.dataTask(with: request).resume()
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
