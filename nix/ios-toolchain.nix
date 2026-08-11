# Swift 6.3 for building the iOS app on Linux (nixpkgs swift is 5.10).
{ pkgs }:

let
  inherit (pkgs) lib stdenv;

  swiftVersion = "6.3";

  swiftUnpacked = stdenv.mkDerivation {
    pname = "swift-unpacked";
    version = swiftVersion;

    src = pkgs.fetchurl {
      url = "https://download.swift.org/swift-${swiftVersion}-release/ubuntu2404/swift-${swiftVersion}-RELEASE/swift-${swiftVersion}-RELEASE-ubuntu24.04.tar.gz";
      hash = "sha256-hbp90WlgtgriprgXMbriNvt85TOaB2Qo/JhNlgZo/b0=";
    };

    dontFixup = true;

    installPhase = ''
      runHook preInstall
      mkdir -p "$out"
      cp -r usr/. "$out"
      runHook postInstall
    '';
  };

  #sandbox needs a C toolchain and libc headers.
  swiftFHS =
    name:
    pkgs.buildFHSEnv {
      inherit name;
      targetPkgs =
        p: with p; [
          swiftUnpacked
          binutils
          cacert
          curl
          git
          gcc
          gcc-unwrapped
          glibc.dev
          glibc.static
          libedit
          libuuid
          # SwiftPM wants libxml2.so.2, nixpkgs default is .so.16.
          libxml2_13
          ncurses
          python3
          sqlite
          unzip
          zlib
        ];
      profile = ''
        export LD_LIBRARY_PATH=/usr/lib:/usr/lib64''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
        export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
        export GIT_SSL_CAINFO="$SSL_CERT_FILE"
        export CC="${swiftUnpacked}/bin/clang"
        export CXX="${swiftUnpacked}/bin/clang++"
      '';
      runScript = "${swiftUnpacked}/bin/${name}";
      meta = {
        description = "Swift ${swiftVersion} (${name}) from swift.org, run in an FHS sandbox";
        homepage = "https://swift.org";
        license = lib.licenses.asl20;
        mainProgram = name;
        platforms = [
          "x86_64-linux"
          "aarch64-linux"
        ];
      };
    };

  swift = pkgs.symlinkJoin {
    name = "swift-${swiftVersion}";
    paths = [
      (swiftFHS "swift")
      (swiftFHS "swiftc")
    ];
  };
in
{
  inherit swift;
}
