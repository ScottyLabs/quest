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
    postgres.enable = true;
    valkey.enable = true;

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

    ricochet.enable = true;
    ricochet.appUrl = "http://localhost:8080";
  };

  services.postgres.extensions = extensions: [ extensions.postgis ];

  # normally logs are scoped to crates
  env.RUST_LOG = pkgs.lib.mkForce "info,quest=debug,ricochet=debug";

  claude.code.mcpServers = {
    "mcp.devenv.sh" = {
      type = "http";
      url = "https://mcp.devenv.sh";
    };
    svelte = {
      type = "http";
      url = "https://mcp.svelte.dev/mcp";
    };
  };

  android = {
    enable = true;
    platforms.version = [ "36" ];
    buildTools.version = [ "35.0.0" ];
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

  packages = [
    ios.xtool
    ios.swift
    pkgs.usbmuxd
    pkgs.libimobiledevice
    pkgs.ideviceinstaller
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

        # release ships against prod; every dev build talks to the backend on
        # this machine, reachable from the device at $1
        api_base() {
          if [ "''${1-}" = "prod" ]; then
            echo "https://cmu.quest"
          else
            echo "http://''${1}:''${PORT:-8080}"
          fi
        }
        lan_ip() { hostname -I | awk '{print $1}'; }

        # reuse a dev server that is already up; otherwise start one and wait
        # for THIS run's readiness line, not a stale one from a previous run
        ensure_dev_server() {
          if curl -sf -m 2 -o /dev/null "http://127.0.0.1:5173/"; then
            echo "reusing the dev server already on :5173"
            return
          fi
          : > /tmp/quest-vite.log
          deno task dev --port 5173 --strictPort >/tmp/quest-vite.log 2>&1 &
          vite=$!
          trap 'kill $vite 2>/dev/null || true' EXIT
          until grep -q "Local:" /tmp/quest-vite.log 2>/dev/null; do
            if ! kill -0 $vite 2>/dev/null; then
              echo "dev server failed to start:" >&2
              tail -5 /tmp/quest-vite.log >&2
              exit 1
            fi
            sleep 1
          done
        }

        case "$sub" in
        build)
          if [ "''${1-}" = "--release" ]; then
            export VITE_QUEST_API_BASE="$(api_base prod)"
            echo "backend: $VITE_QUEST_API_BASE"
            deno task cap:sync android
            (cd android && ./gradlew assembleRelease bundleRelease)
            echo "apk: android/app/build/outputs/apk/release/ (unsigned without a keystore)"
            echo "aab: android/app/build/outputs/bundle/release/"
          else
            export VITE_QUEST_API_BASE="$(api_base "$(lan_ip)")"
            echo "backend: $VITE_QUEST_API_BASE"
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

          # emulators reach the host loopback at 10.0.2.2
          if [ -z "$host" ]; then
            if printf '%s\n' ''${args[@]+"''${args[@]}"} | grep -q emulator; then
              host=10.0.2.2
            else
              host=$(lan_ip)
            fi
          fi

          export VITE_QUEST_API_BASE="$(api_base "$host")"
          echo "backend: $VITE_QUEST_API_BASE"

          if [ -z "$live" ]; then
            deno task cap:sync android
            exec deno task cap run android ''${args[@]+"''${args[@]}"}
          fi

          ensure_dev_server

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

        # Two concurrent runs each create an "XTL profile <id>" on Apple's side;
        # xtool only cleans up when it finds exactly one, so the second profile
        # wedges every later run with a 409 until it expires. One at a time.
        exec 9>/tmp/quest-xtool.lock
        flock -n 9 || {
          echo "another ios-xtool run holds the lock; wait for it or kill it" >&2
          exit 1
        }

        sub="''${1-help}"
        [ $# -gt 0 ] && shift

        api_base() {
          if [ "''${1-}" = "prod" ]; then
            echo "https://cmu.quest"
          else
            echo "http://''${1}:''${PORT:-8080}"
          fi
        }
        lan_ip() { hostname -I | awk '{print $1}'; }

        case "$sub" in
        build)
          if [ "''${1-}" = "--release" ]; then
            export VITE_QUEST_API_BASE="$(api_base prod)"
            echo "backend: $VITE_QUEST_API_BASE"
            deno task cap:sync ios
            (cd ios/xtool && xtool dev build --ipa --configuration release)
            echo "ipa: ios/xtool/xtool/App.ipa"
          else
            export VITE_QUEST_API_BASE="$(api_base "$(lan_ip)")"
            echo "backend: $VITE_QUEST_API_BASE"
            deno task cap:sync ios
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

          [ -n "$host" ] || host=$(lan_ip)
          export VITE_QUEST_API_BASE="$(api_base "$host")"
          echo "backend: $VITE_QUEST_API_BASE"

          if [ -n "$live" ]; then
            export CAP_SERVER_URL="http://$host:5173"
            echo "live reload from $CAP_SERVER_URL"
          fi

          deno task cap:sync ios
          (cd ios/xtool && xtool dev run ''${args[@]+"''${args[@]}"})

          # the app is installed now, so the dev server can take over this
          # terminal: exec means its log is the only thing you are looking at,
          # and ctrl-c stops it directly with nothing left running behind you
          if [ -n "$live" ]; then
            echo
            echo "--- dev server on :5173 (relaunch the app once vite is ready) ---"
            exec deno task dev --port 5173 --strictPort
          fi
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

  treefmt.config.settings.excludes = [
    ".devenv/*"
    "**/node_modules/*"
  ];
}
