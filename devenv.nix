{ pkgs, config, inputs, ... }:

let
  cargoNix = pkgs.callPackage ./Cargo.nix { };
  quest = cargoNix.rootCrate.build;
in
{
  imports = [ inputs.scottylabs.devenvModules.default ];

  scottylabs = {
    enable = true;
    project.name = "quest";
    rust.enable = true;
    secrets.enable = true;
    kennel.services.quest = {
      customDomain = "cmu.quest";
    };
  };

  packages = [
    quest
  ];

  outputs = { inherit quest; };
}
