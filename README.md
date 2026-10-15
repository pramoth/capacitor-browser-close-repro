# @capacitor/browser: `Browser.close()` re-opens the last URL on Android

Minimal reproduction for an `@capacitor/browser` bug on Android. Created with
`npm init @capacitor/app`, plus `@capacitor/app` and `@capacitor/browser`.

The app does what any OAuth sign-in or sign-out flow does:

1. `Browser.open()` a URL that redirects straight back to the app's custom scheme
   (`capbrowserrepro://callback`).
2. `App.addListener('appUrlOpen', …)` receives the deep link and calls `Browser.close()`.

**Expected:** one `appUrlOpen` per `Browser.open()`.
**Actual:** two. `Browser.close()` opens the same URL in a new Custom Tab, which redirects
back again.

All the code is in [`src/js/main.js`](src/js/main.js). The only native change from the
template is the custom-scheme intent filter in
[`android/app/src/main/AndroidManifest.xml`](android/app/src/main/AndroidManifest.xml).

## Run it

```bash
npm install
npm run build
npx cap sync android

# a stand-in OAuth server: answers every request with a 302 to capbrowserrepro://callback
# and logs each hit
node redirect-server.mjs

# in another terminal, with the emulator or device connected
adb reverse tcp:8787 tcp:8787
npx cap run android
```

Tap **1. Browser.open(redirecting URL)** a few times.

- The counter on screen reads `Browser.open() calls: 3   appUrlOpen events: 6`, and every
  `appUrlOpen` arrives twice with the same `open=N`.
- `redirect-server.mjs` logs two GETs per tap.
- `adb logcat -s ActivityTaskManager` shows a second Chrome launch per tap
  (`START … com.android.chrome/…IntentDispatcher … from uid <this app>`) right after the
  `BrowserControllerActivity` that `close()` started.

Tested on an API 35 emulator (Chrome 124) with `@capacitor/browser` 8.0.5 and 8.0.4.

### Why a local redirect server

The bug only shows when the redirect comes back while the Custom Tab is still starting
(within ~0.5 s on the emulator). After that, Android has already stopped
`BrowserControllerActivity`, so the deep link destroys it at once and `close()` finds
nothing to close. A real OAuth server on a fast network, or one that already has a session,
redirects that fast. A public redirect service over a slow link (e.g.
`https://httpbin.org/redirect-to?url=capbrowserrepro://callback`) usually doesn't, so it
reproduces only sometimes.

The **Delay before `Browser.close()`** field adds a pause before `close()`, as when an app
exchanges a code first. The bug still shows at 100–250 ms, just not on every tap.

### The rarer, worse outcome: a stuck controller

Now and then (2 in ~180 taps in stress runs, at an 80–100 ms delay), a `BrowserControllerActivity`
is created that launches nothing and stays on top of the app. It is translucent, so the app
looks normal, but:

- taps no longer reach the app;
- **2. Browser.open(https://capacitorjs.com)**, or any `Browser.open()`, opens nothing, and its
  promise never settles (`START … BrowserControllerActivity … result code=3` in logcat);
- only Back gets rid of it.

To look for it, tap **1** repeatedly with the delay at 80–100 and check
`adb shell dumpsys activity activities | grep BrowserControllerActivity` after each round trip.
