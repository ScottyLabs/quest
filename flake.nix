{
  description = "CMU Orientation Quest";

  nixConfig = {
    extra-substituters = [ "https://scottylabs.cachix.org" ];
    extra-trusted-public-keys = [
      "scottylabs.cachix.org-1:hajjEX5SLi/Y7yYloiXTt2IOr3towcTGRhMh1vu6Tjg="
    ];
  };

  inputs = {
    scottylabs.url = "git+https://git.cmu.dev/ScottyLabs/kennel";
    nixpkgs.follows = "scottylabs/nixpkgs";
    flake-parts.follows = "scottylabs/flake-parts";
  };

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.scottylabs.flakeModules.default ];
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      perSystem =
        {
          pkgs,
          lib,
          helpers,
          ...
        }:
        let
          android = import ./nix/android.nix { inherit pkgs; };
          ios = import ./nix/ios-toolchain.nix { inherit pkgs; };

          webSrc = lib.fileset.toSource {
            root = ./.;
            fileset = lib.fileset.unions [
              ./deno.json
              ./deno.lock
              ./apps/portal
              # workspace member, so deno.lock lists its dependencies
              ./apps/poster-generator/deno.json
              (lib.fileset.difference ./apps/mobile (
                lib.fileset.unions [
                  ./apps/mobile/android
                  ./apps/mobile/ios
                ]
              ))
            ];
          };

          mobile = helpers.buildDenoTask {
            src = webSrc;
            cwd = "apps/mobile";
            pname = "quest-mobile";
            version = "0.1.0";
            output = "build";
          };

          portal = helpers.buildDenoTask {
            src = webSrc;
            cwd = "apps/portal";
            pname = "quest-portal";
            version = "0.1.0";
            output = "build";
          };

          bundle =
            pkgs.runCommand "quest-bundle.zip"
              {
                nativeBuildInputs = [ pkgs.zip ];
              }
              ''
                cd ${mobile}
                find . -type f -o -type l | sort | zip -q -X -9 "$out" -@
              '';
        in
        {
          scottylabs = {
            project.name = "quest";
            rust.enable = true;
            postgres = {
              enable = true;
              extensions = e: [ e.postgis ];
            };
            valkey.enable = true;

            deno = {
              enable = true;
              svelte.enable = true;
              dirs = [
                "apps/mobile"
                "apps/portal"
                "apps/poster-generator"
              ];
            };

            ricochet = {
              enable = true;
              appUrl = "http://localhost:8080";
            };

            processes.portal.run = "deno task --cwd apps/portal dev";

            shell = {
              packages =
                android.packages
                ++ [
                  pkgs.libimobiledevice
                  pkgs.ideviceinstaller
                  pkgs.unzip
                  pkgs.sea-orm-cli
                ]
                ++ lib.optionals pkgs.stdenv.hostPlatform.isLinux [
                  ios.swift
                  pkgs.usbmuxd
                ];

              env = android.env // {
                # normally logs are scoped to crates
                RUST_LOG = lib.mkForce "info,quest=debug,ricochet=debug";
              };

              inherit (android) exports;

              scripts.android = ''exec scripts/android "$@"'';
            };
          };

          treefmt.settings.global.excludes = [ "**/node_modules/*" ];

          # legal text and seeded challenge copy keep their typography
          pre-commit.settings.hooks.block-ai-slop.excludes = [
            "^crates/quest/src/legal/"
            "^crates/migration/src/m20260810_000200_seed_challenges\\.rs$"
          ];

          services.quest = {
            package = helpers.buildRustService {
              src = ./.;
              pname = "quest";
              version = "0.1.0";
              paths = [
                "crates/quest"
                "crates/entity"
                "crates/migration"
              ];
              extraSources = [
                "crates/quest/src/landing"
                "crates/quest/src/legal"
                "crates/quest/src/passes/assets"
                "crates/quest/src/portal/unbuilt.html"
              ];
              buildArgs.cargoExtraArgs = "--locked -p quest";
            };
            customDomain = "cmu.quest";
            env = {
              QUEST_BUNDLE = "${bundle}";
              QUEST_PORTAL = "${portal}";
            };
          };
        };
    };
}
