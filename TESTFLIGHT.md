# Getting Courtside onto your phone (TestFlight)

Everything below is prepared except the one thing only you can choose: the **bundle identifier**.

## 1. Set your identity in `app.json`

```jsonc
"ios": {
  "bundleIdentifier": "com.<yourname>.courtside",   // currently the placeholder com.yourname.courtside
  "appleTeamId": "<your Team ID>"                   // developer.apple.com/account -> Membership details
}
```

The bundle ID must be unique to your Apple account. The Team ID in the file and the one Xcode picked in the
generated `ios/` project were different when this was written: check which one is yours.
If you change the bundle ID, rebuild any local development build (`npx expo run:ios`); Expo Go is unaffected.

## 2. Build and send it

You need the paid Apple Developer account and an Expo account (`npx eas-cli login`).

```bash
npx testflight                                   # fastest: credentials, production build, submit
# or, step by step:
npx eas-cli build --platform ios --profile production --auto-submit
```

Apple takes about 5-10 minutes to process the build. Then in App Store Connect > your app > TestFlight, add
yourself under **Internal Testing** (no review needed) and install from the TestFlight app. Builds expire after 90
days; push a new one before then.

## 3. Optional: the gateway

Deploy `gateway/` (see its README) and build with `EXPO_PUBLIC_ESPN_PROXY=https://<your-worker>/espn` so the app
caches ESPN through your own Worker. Without it the app talks to ESPN directly.
