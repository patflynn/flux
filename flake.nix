{
  description = "Flux - Umbrella app (Workouts, Meditate, Check-in)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    klaus = {
      url = "github:patflynn/klaus";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      klaus,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nixfmt-rfc-style
            android-tools
            klaus.packages.${system}.default
          ];

          shellHook = ''
            echo "Flux dev shell"
            echo "Commands:"
            echo "  npm ci             - Install dependencies"
            echo "  npm run dev        - Vite dev server"
            echo "  npm run build      - Production build to dist/"
            echo "  adb devices        - list connected Android devices"
          '';
        };

        # Separate shell for E2E tests with Playwright
        devShells.test = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            playwright-driver.browsers
          ];

          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            npm ci --prefer-offline --no-audit --no-fund --quiet
            echo "Flux test shell (with Playwright)"
          '';
        };

        # Separate shell for Android builds. Scoped here (not on the default
        # shell) because androidenv pulls multi-GB unfree SDK components.
        devShells.android =
          let
            androidPkgs = import nixpkgs {
              inherit system;
              config = {
                allowUnfree = true;
                android_sdk.accept_license = true;
              };
            };
            androidComposition = androidPkgs.androidenv.composeAndroidPackages {
              platformVersions = [ "34" ];
              buildToolsVersions = [ "34.0.0" ];
              includeNDK = false;
            };
            androidSdk = androidComposition.androidsdk;
          in
          androidPkgs.mkShell {
            buildInputs = with androidPkgs; [
              nodejs_20
              jdk17
              gradle
              androidSdk
            ];

            ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
            ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
            # AGP 8.x looks up aapt2; point it at the nix-provided one so gradle
            # doesn't try to download its own copy.
            GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${androidSdk}/libexec/android-sdk/build-tools/34.0.0/aapt2";

            shellHook = ''
              echo "Flux android dev shell"
              echo "  ANDROID_HOME=$ANDROID_HOME"
              echo ""
              echo "Commands:"
              echo "  npm ci && npm run build && npx cap sync android   - sync web bundle into android/"
              echo "  (cd android && ./gradlew assembleDebug)            - build debug APK"
              echo "  (cd android && ./gradlew tasks)                    - list gradle tasks"
            '';
          };

        packages.default =
          let
            commit = self.shortRev or self.dirtyShortRev or "dev";
            ver = "1.0.0";
            versionJSON = builtins.toJSON {
              version = ver;
              inherit commit;
            };
          in
          pkgs.buildNpmPackage {
            pname = "flux";
            version = ver;
            src = ./.;

            # Run `prefetch-npm-deps package-lock.json` to refresh after
            # dependency changes. Lockfile-derived hash; updates when the
            # lockfile changes.
            npmDepsHash = "sha256-tUu8eZlrVL+sABAW5mddztGoz80GzCDNA1vCSptOZaE=";

            # Capacitor's optional Android peer dep tries to run a gradle task
            # in postinstall; skip it since we only ship the web bundle here.
            npmFlags = [ "--ignore-scripts" ];

            installPhase = ''
              runHook preInstall
              npm run build
              mkdir -p $out
              cp -r dist/* $out/
              echo '${versionJSON}' > $out/version.json
              runHook postInstall
            '';
          };
      }
    );
}
