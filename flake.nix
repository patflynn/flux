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
            klaus.packages.${system}.default
          ];

          shellHook = ''
            echo "Flux dev shell"
            echo "Commands:"
            echo "  npm ci             - Install dependencies"
            echo "  npm run dev        - Vite dev server"
            echo "  npm run build      - Production build to dist/"
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
            npmDepsHash = "sha256-fUhyKOMkITX+xxb0wONkkXjFLzLzCoi4IxR7X7C1d88=";

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
