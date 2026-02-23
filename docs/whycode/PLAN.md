<plan id="fix-02" linear-id="SHA-3">
  <name>Android Screenshot &amp; Documentation</name>
  <type>frontend</type>
  <phase>2</phase>

  <completion-contract>
    <rule>You CANNOT output PLAN_COMPLETE until ALL verifications pass</rule>
    <rule>If any verification fails, FIX IT and try again</rule>
    <rule>You have multiple iterations - USE THEM</rule>
    <rule>The orchestrator verifies externally - lying = sent back to fix</rule>
  </completion-contract>

  <completion-mode>strict</completion-mode>

  <immutable-decisions>
    <package-manager>yarn</package-manager>
    <monorepo>turborepo</monorepo>
    <language>typescript</language>
    <testing>vitest</testing>
  </immutable-decisions>

  <pm-commands>
    <install>yarn install</install>
    <add-dep>yarn add</add-dep>
    <build>yarn build</build>
    <test>yarn test</test>
    <typecheck>yarn typecheck</typecheck>
    <lint>yarn lint</lint>
  </pm-commands>

  <available-tools>
    <linear enabled="true">Log to audit/log.md, orchestrator handles Linear updates</linear>
    <context7 enabled="false">Not available</context7>
  </available-tools>

  <final-verification>
    <check name="typecheck" command="yarn typecheck" required="true"/>
    <check name="lint" command="yarn lint" required="true"/>
    <check name="test" command="yarn test" required="true"/>
    <check name="build" command="yarn build" required="true"/>
    <check name="smoke" command="node -e &quot;const c = require('./packages/react-native/dist/index.js'); console.log('ViewShotCapture:', typeof c.ViewShotCapture);&quot;" required="true">
      <fail-if-contains>Error:</fail-if-contains>
      <description>ViewShotCapture must be exported and loadable</description>
    </check>
  </final-verification>

  <context>
    Plan fix-01 is COMPLETE. The async trigger activation changes are committed.

    This plan addresses two remaining items:
    1. Android GL/Skia screenshot compatibility via handleGLSurfaceViewOnAndroid option
    2. Documentation for react-native-shake autolinking workaround in Expo monorepos

    EXISTING CODE STATE:
    - packages/react-native/src/capture/screenshot.ts has ViewShotCapture class
    - The capture() method calls captureRef(this.viewRef, { format: 'png', quality: 1, result: 'base64' })
    - CaptureRefFn type definition at line 14 does NOT include handleGLSurfaceViewOnAndroid
    - No README.md exists in packages/react-native/
    - React Native Platform module can detect Android via Platform.OS === 'android'
  </context>

  <tasks>
    <task id="task-004" type="auto" linear-id="SHA-3">
      <name>Add handleGLSurfaceViewOnAndroid for Android view-shot</name>
      <files>packages/react-native/src/capture/screenshot.ts</files>
      <action>
        1. Update the CaptureRefFn type definition to include handleGLSurfaceViewOnAndroid:
           type CaptureRefFn = (
             viewRef: number | RefObject&lt;unknown&gt;,
             options?: {
               format?: 'png' | 'jpg' | 'webm';
               quality?: number;
               result?: 'base64' | 'tmpfile' | 'data-uri';
               width?: number;
               height?: number;
               handleGLSurfaceViewOnAndroid?: boolean;
             },
           ) =&gt; Promise&lt;string&gt;;

        2. In the capture() method, detect Android platform and add the option:
           Import Platform from react-native (use existing dynamic import pattern).
           When calling captureRef, add handleGLSurfaceViewOnAndroid: true if Platform.OS === 'android'.

           const isAndroid = /* detect via Platform.OS from dynamic import */;
           const base64 = await captureRef(this.viewRef, {
             format: 'png',
             quality: 1,
             result: 'base64',
             ...(isAndroid &amp;&amp; { handleGLSurfaceViewOnAndroid: true }),
           });

        3. Use the existing dynamic import pattern for react-native (already imported for Dimensions).
           Extract Platform.OS from the same import.
      </action>
      <verify>cd packages/react-native &amp;&amp; npx tsc --noEmit</verify>
      <done>captureRef call includes handleGLSurfaceViewOnAndroid: true on Android. CaptureRefFn type updated. TypeScript compiles clean.</done>
    </task>

    <task id="task-005" type="auto" linear-id="SHA-3">
      <name>Add react-native-shake autolinking workaround documentation</name>
      <files>packages/react-native/README.md</files>
      <action>
        Create packages/react-native/README.md with:

        1. Package overview: @shakenbake/react-native - React Native SDK for ShakeNbake bug reporting
        2. Installation section with yarn/npm commands
        3. Peer dependencies list (react-native-shake, react-native-view-shot, @shopify/react-native-skia)
        4. Basic usage with ShakeNbakeProvider
        5. Troubleshooting section with:
           a. "react-native-shake autolinking in Expo monorepos" subsection:
              - Explain that react-native-shake strict exports may break autolinking discovery in monorepo setups
              - Provide react-native.config.js workaround snippet:
                const path = require('path');
                module.exports = {
                  dependencies: {
                    'react-native-shake': {
                      root: path.resolve(__dirname, '../../node_modules/react-native-shake'),
                    },
                  },
                };
              - Note: rebuild required after adding native deps (npx expo prebuild --clean)
              - Note: react-native-shake is not supported in Expo Go, requires development build
           b. "Android GL/Skia screenshot capture" subsection:
              - Explain that handleGLSurfaceViewOnAndroid is automatically enabled on Android
              - This ensures screenshots work correctly when Skia, MapView, or other GL surfaces are present
      </action>
      <verify>test -f packages/react-native/README.md &amp;&amp; echo "README exists"</verify>
      <done>README.md created with installation, usage, and troubleshooting sections including react-native-shake autolinking workaround and Android GL note.</done>
    </task>
  </tasks>

  <on-complete>
    BEFORE outputting PLAN_COMPLETE, verify:
    □ All task verify commands passed
    □ yarn typecheck passed (exit code 0)
    □ yarn lint passed (exit code 0)
    □ yarn test passed (all tests green)
    □ yarn build passed (exit code 0)
    □ Smoke: ViewShotCapture is exported and loadable

    If ANY failed: FIX and re-verify. Do NOT output PLAN_COMPLETE.
  </on-complete>
</plan>