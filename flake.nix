{
  description = "CMU Orientation Quest";

  nixConfig = {
    extra-substituters = [ "https://scottylabs.cachix.org" ];
    extra-trusted-public-keys = [
      "scottylabs.cachix.org-1:hajjEX5SLi/Y7yYloiXTt2IOr3towcTGRhMh1vu6Tjg="
    ];
  };

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    scottylabs = {
      url = "git+https://codeberg.org/ScottyLabs/kennel";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      scottylabs,
      ...
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          helpers = scottylabs.mkLib pkgs;

          questSrc = pkgs.lib.fileset.toSource {
            root = ./.;
            fileset = pkgs.lib.fileset.unions [
              ./Cargo.toml
              ./Cargo.lock
              ./crates/quest
              ./crates/entity
              ./crates/migration
            ];
          };

          webSrc = pkgs.lib.fileset.toSource {
            root = ./.;
            fileset = pkgs.lib.fileset.unions [
              ./deno.json
              ./deno.lock
              ./apps/portal
              (pkgs.lib.fileset.difference ./apps/mobile (
                pkgs.lib.fileset.unions [
                  ./apps/mobile/android
                  ./apps/mobile/ios
                ]
              ))
            ];
          };

          quest = helpers.buildRustService {
            src = ./.;
            pname = "quest";
            version = "0.1.0";
            paths = [
              "crates/quest"
              "crates/entity"
              "crates/migration"
            ];
            nativeBuildInputs = [
              pkgs.pkg-config
              pkgs.makeWrapper
            ];
            buildInputs = [ ];
            buildArgs = {
              cargoExtraArgs = "-p quest";
              src = questSrc;
              postInstall = ''
                mkdir -p $out/share/quest
                cp ${bundle} $out/share/quest/bundle.zip
                wrapProgram $out/bin/quest \
                  --set-default QUEST_BUNDLE $out/share/quest/bundle.zip \
                  --set-default QUEST_PORTAL ${portal}
              '';
            };
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
          inherit
            quest
            mobile
            bundle
            portal
            ;
          default = quest;
        }
      );
    };
}
