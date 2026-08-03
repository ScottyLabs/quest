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

          quest = helpers.buildRustService {
            src = ./.;
            pname = "quest";
            version = "0.1.0";
            paths = [ "crates/quest" ];
            nativeBuildInputs = [
              pkgs.pkg-config
            ];
            buildInputs = [ ];
            buildArgs.cargoExtraArgs = "-p quest";
          };

          mobile = helpers.buildDenoTask {
            src = ./apps/mobile;
            pname = "quest-mobile";
            version = "0.1.0";
            output = "build";
          };
        in
        {
          inherit quest mobile;
        }
      );
    };
}
