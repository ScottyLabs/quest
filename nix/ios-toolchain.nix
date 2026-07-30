# xtool + Swift 6.3 for building the iOS app on Linux (nixpkgs swift is 5.10).
{ pkgs }:

let
  inherit (pkgs) lib stdenv;

  xtoolVersion = "1.17.0";

  xtoolSources = {
    x86_64-linux = {
      arch = "x86_64";
      hash = "sha256-dWbWK4KaTerbAbU4nJT0V2PYUfIExdIvo26fnRyI1Xs=";
    };
    aarch64-linux = {
      arch = "aarch64";
      hash = "sha256-moxH97Lum0UrzO585yPA/IdGrFDUpSWjbaA1hIa8N14=";
    };
  };

  xtoolSource =
    xtoolSources.${stdenv.hostPlatform.system}
      or (throw "xtool: no AppImage for ${stdenv.hostPlatform.system}");

  xtoolAppImage = pkgs.appimageTools.wrapType2 {
    pname = "xtool";
    version = xtoolVersion;
    src = pkgs.fetchurl {
      url = "https://github.com/xtool-org/xtool/releases/download/${xtoolVersion}/xtool-${xtoolSource.arch}.AppImage";
      inherit (xtoolSource) hash;
    };
    extraPkgs = pkgs: xtoolRuntimeDeps pkgs;
  };

  xtoolRuntimeDeps =
    p: with p; [
      cacert
      curl
      git
      libimobiledevice
      unzip
      zip
    ];

  xtool =
    pkgs.runCommand "xtool-${xtoolVersion}"
      {
        nativeBuildInputs = [ pkgs.makeWrapper ];
        meta = {
          description = "Cross-platform Xcode replacement";
          homepage = "https://xtool.sh";
          license = lib.licenses.mit;
          mainProgram = "xtool";
          platforms = lib.attrNames xtoolSources;
        };
      }
      ''
        mkdir -p "$out/bin"
        makeWrapper ${xtoolAppImage}/bin/xtool "$out/bin/xtool" \
          --prefix PATH : ${lib.makeBinPath (xtoolRuntimeDeps pkgs)}
      '';

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
        platforms = lib.attrNames xtoolSources;
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
  inherit xtool swift;
}
