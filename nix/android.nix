# Android SDK and JDK for building and emulating the Capacitor app
{ pkgs }:

let
  inherit (pkgs) lib;

  buildToolsVersion = "35.0.0";

  # the SDK is unfree and needs its license accepted
  androidPkgs = import pkgs.path {
    inherit (pkgs.stdenv.hostPlatform) system;
    config = {
      allowUnfree = true;
      android_sdk.accept_license = true;
    };
  };

  sdk =
    (androidPkgs.androidenv.composeAndroidPackages {
      platformVersions = [ "36" ];
      buildToolsVersions = [ buildToolsVersion ];
      includeEmulator = true;
      includeSystemImages = true;
      systemImageTypes = [ "google_apis_playstore" ];
      abiVersions = [
        "arm64-v8a"
        "x86_64"
      ];
      cmakeVersions = [ ];
      includeNDK = false;
      useGoogleTVAddOns = false;
      includeExtras = [ ];
    }).androidsdk;

  home = "${sdk}/libexec/android-sdk";
in
{
  packages = [
    sdk
    pkgs.jdk21
  ];

  env = {
    ANDROID_HOME = home;
    JAVA_HOME = "${pkgs.jdk21.home}";
    # gradle's own aapt2 doesn't run on NixOS
    GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${home}/build-tools/${buildToolsVersion}/aapt2";
  };

  exports = ''
    export PATH="$PATH:${home}/platform-tools:${home}/cmdline-tools/latest/bin:${home}/emulator"
    export LD_LIBRARY_PATH="${
      lib.makeLibraryPath [
        pkgs.vulkan-loader
        pkgs.libGL
      ]
    }:${home}/build-tools/${buildToolsVersion}/lib64''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  '';
}
