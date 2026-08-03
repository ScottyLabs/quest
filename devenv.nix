{ pkgs, inputs, ... }:

let
  ios = import ./nix/ios-toolchain.nix { inherit pkgs; };
in
{
  imports = [
    inputs.scottylabs.devenvModules.default
  ];

  scottylabs = {
    enable = true;
    project.name = "quest";
    rust.enable = true;
    secrets.enable = true;

    deno = {
      enable = true;
      svelte = {
        enable = true;
        dir = "apps/mobile";
      };
    };

    kennel.services.quest = {
      customDomain = "cmu.quest";
    };
  };

  # Gradle wrapper is 8.14, which rejects the host JDK 25.
  android = {
    enable = true;
    platforms.version = [ "36" ];
    # AGP 8.13's default; the nix SDK is read-only so Gradle can't fetch others.
    buildTools.version = [ "35.0.0" ];
    # Enable emulators for time being
    emulator.enable = true;
    systemImages.enable = true;
    ndk.enable = false;
    cmake.version = [ ];
    googleTVAddOns.enable = false;
    extras = [ ];
  };

  languages.java = {
    enable = true;
    jdk.package = pkgs.jdk21;
  };

  # xtool builds ios/xtool; needs a Darwin SDK once: `xtool sdk install Xcode.xip`.
  packages = [
    ios.xtool
    ios.swift
    pkgs.usbmuxd
    pkgs.libimobiledevice
    pkgs.unzip
  ];

  scripts = {
    android = {
      description = "android build|run|emulator|devices  (run --help for flags)";
      exec = ''
        set -euo pipefail
        cd "$DEVENV_ROOT/apps/mobile"

        emulator_libs="$ANDROID_HOME/emulator/lib64:$ANDROID_HOME/emulator/lib64/qt/lib"
        sub="''${1-help}"
        [ $# -gt 0 ] && shift

        case "$sub" in
        build)
          if [ "''${1-}" = "--release" ]; then
            deno task cap:sync android
            (cd android && ./gradlew assembleRelease bundleRelease)
            echo "apk: android/app/build/outputs/apk/release/ (unsigned without a keystore)"
            echo "aab: android/app/build/outputs/bundle/release/"
          else
            deno task cap:sync android
            (cd android && ./gradlew assembleDebug)
            echo "apk: android/app/build/outputs/apk/debug/app-debug.apk"
          fi
          ;;
        run)
          live=""
          host=""
          args=()
          while [ $# -gt 0 ]; do
            case "$1" in
            --live) live=1 ;;
            --host) host="$2"; shift ;;
            *) args+=("$1") ;;
            esac
            shift
          done

          if [ -z "$live" ]; then
            deno task cap:sync android
            exec deno task cap run android ''${args[@]+"''${args[@]}"}
          fi

          # emulators reach the host loopback at 10.0.2.2
          if [ -z "$host" ]; then
            if printf '%s\n' ''${args[@]+"''${args[@]}"} | grep -q emulator; then
              host=10.0.2.2
            else
              host=$(hostname -I | awk '{print $1}')
            fi
          fi

          deno task dev >/tmp/quest-vite.log 2>&1 &
          vite=$!
          trap 'kill $vite 2>/dev/null || true' EXIT
          until grep -q "Local:" /tmp/quest-vite.log 2>/dev/null; do sleep 1; done

          echo "live reload from http://$host:5173 (ctrl-c to stop)"
          deno task cap run android --live-reload --host "$host" --port 5173 \
            ''${args[@]+"''${args[@]}"}
          ;;
        emulator)
          name=quest
          args=()
          for arg in "$@"; do
            case "$arg" in
            --headless) args+=(-no-window -no-audio -gpu swiftshader_indirect) ;;
            -*) args+=("$arg") ;;
            *) name="$arg" ;;
            esac
          done
          if ! avdmanager list avd -c | grep -qx "$name"; then
            echo no | avdmanager create avd -n "$name" \
              -k "system-images;android-36;google_apis_playstore;x86_64" --force
          fi
          # only the emulator gets its bundled libs: they break java tools
          LD_LIBRARY_PATH="$emulator_libs" \
            exec emulator -avd "$name" -no-boot-anim ''${args[@]+"''${args[@]}"}
          ;;
        devices)
          deno task cap run android --list
          ;;
        *)
          cat <<'USAGE'
        android build [--release]        debug APK, or release APK + AAB
        android run [--live] [--host IP] [--target ID]
                                        install and launch; --live serves from vite
        android emulator [NAME] [--headless]
                                        boot an AVD, creating it if missing
        android devices                 list attached devices and AVDs
        USAGE
          ;;
        esac
      '';
    };

    ios-xtool = {
      description = "ios-xtool build|run|devices|open  (run --help for flags)";
      exec = ''
        set -euo pipefail
        cd "$DEVENV_ROOT/apps/mobile"

        sub="''${1-help}"
        [ $# -gt 0 ] && shift

        case "$sub" in
        build)
          deno task cap:sync ios
          if [ "''${1-}" = "--release" ]; then
            (cd ios/xtool && xtool dev build --ipa --configuration release)
            echo "ipa: ios/xtool/xtool/App.ipa"
          else
            (cd ios/xtool && xtool dev build)
            echo "app: ios/xtool/xtool/App.app"
          fi
          ;;
        run)
          live=""
          host=""
          args=()
          while [ $# -gt 0 ]; do
            case "$1" in
            --live) live=1 ;;
            --host) host="$2"; shift ;;
            *) args+=("$1") ;;
            esac
            shift
          done

          if [ -n "$live" ]; then
            [ -n "$host" ] || host=$(hostname -I | awk '{print $1}')
            deno task dev >/tmp/quest-vite.log 2>&1 &
            vite=$!
            trap 'kill $vite 2>/dev/null || true' EXIT
            until grep -q "Local:" /tmp/quest-vite.log 2>/dev/null; do sleep 1; done
            export CAP_SERVER_URL="http://$host:5173"
            echo "live reload from $CAP_SERVER_URL (ctrl-c to stop)"
          fi

          deno task cap:sync ios
          (cd ios/xtool && xtool dev run ''${args[@]+"''${args[@]}"})
          ;;
        devices)
          xtool devices
          ;;
        open)
          deno task cap:sync ios
          deno task cap open ios
          ;;
        *)
          cat <<'USAGE'
        ios-xtool build [--release]      unsigned .app, or release .ipa
        ios-xtool run [--live] [--host IP] [--udid X] [--network]
                                         build, sign and launch on a device
        ios-xtool devices                list paired devices (usb and network)
        ios-xtool open                   open the Xcode project (macOS only)
        USAGE
          ;;
        esac
      '';
    };
  };

  # DENO_DIR lives here; formatting svelte's .d.ts breaks svelte-check.
  treefmt.config.settings.excludes = [
    ".devenv/*"
    "**/node_modules/*"
  ];
}
