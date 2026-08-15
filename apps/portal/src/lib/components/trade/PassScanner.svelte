<script lang="ts">
  import jsQR from "jsqr";
  import Field from "$lib/components/Field.svelte";

  let {
    onscan,
    paused = false,
  }: { onscan: (token: string) => void; paused?: boolean } = $props();

  type Decoded = { rawValue: string };
  type Detector = { detect: (source: HTMLVideoElement) => Promise<Decoded[]> };
  type DetectorCtor = {
    new (options: { formats: string[] }): Detector;
    getSupportedFormats?: () => Promise<string[]>;
  };

  const WORKING_EDGE = 640;

  const native = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  const cameraApi =
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
  const secure = typeof globalThis.isSecureContext !== "boolean" || globalThis.isSecureContext;
  const usable = cameraApi && secure;

  let video = $state<HTMLVideoElement | null>(null);
  let cameras = $state<MediaDeviceInfo[]>([]);
  let picked = $state("");
  let fault = $state<string | null>(null);
  let live = $state(false);
  let seen = "";

  const excuse = (error: unknown): string => {
    const name = error instanceof Error ? error.name : "";

    if (name === "NotAllowedError" || name === "SecurityError") {
      return "Camera access was blocked. Allow the camera for this site, or type the Andrew ID.";
    }

    if (name === "NotFoundError" || name === "OverconstrainedError") {
      return "No camera was found on this device. Type the Andrew ID instead.";
    }

    if (name === "NotReadableError") {
      return "The camera is already in use by another app. Close it, or type the Andrew ID.";
    }

    return "The camera could not be started. Type the Andrew ID instead.";
  };

  $effect(() => {
    if (!usable || paused) return;

    const wanted = picked;
    let running = true;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let detector: Detector | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    const scan = (source: HTMLVideoElement): string => {
      const { videoWidth: width, videoHeight: height } = source;
      if (width === 0 || height === 0) return "";

      canvas ??= document.createElement("canvas");
      ctx ??= canvas.getContext("2d", { willReadFrequently: true });
      if (ctx === null) return "";

      const shrink = Math.min(1, WORKING_EDGE / Math.max(width, height));
      const w = Math.max(1, Math.round(width * shrink));
      const h = Math.max(1, Math.round(height * shrink));

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.drawImage(source, 0, 0, w, h);
      const frame = ctx.getImageData(0, 0, w, h);

      return jsQR(frame.data, w, h, { inversionAttempts: "attemptBoth" })?.data.trim() ?? "";
    };

    const read = async (): Promise<void> => {
      const source = video;
      if (source === null || source.readyState < 2) return;

      let token = "";

      try {
        if (detector !== null) {
          token = (await detector.detect(source))[0]?.rawValue.trim() ?? "";
        }

        if (token === "") token = scan(source);
      } catch {
        detector = null;
        return;
      }

      if (token === "" || token === seen) return;

      seen = token;
      onscan(token);
    };

    const start = async (): Promise<void> => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: wanted === "" ? { facingMode: "environment" } : { deviceId: { exact: wanted } },
        });
      } catch (error) {
        fault = excuse(error);
        return;
      }

      if (!running) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }

      if (native !== undefined) {
        const probe = native.getSupportedFormats;
        const formats =
          probe === undefined ? null : await probe.call(native).catch((): string[] => []);

        if (formats === null || formats.includes("qr_code")) {
          detector = new native({ formats: ["qr_code"] });
        }
      }

      fault = null;
      live = true;

      if (video !== null) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }

      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      cameras = devices.filter((device) => device.kind === "videoinput");
      timer = setInterval(() => void read(), 200);
    };

    void start();

    return () => {
      running = false;
      live = false;
      clearInterval(timer);

      if (stream !== null) {
        for (const track of stream.getTracks()) track.stop();
      }

      if (video !== null) video.srcObject = null;
    };
  });
</script>

<div class="scanner">
  {#if !secure}
    <div class="notice">
      <p class="lead">Scanning needs a secure connection</p>
      <p>
        Browsers only hand out the camera over https or on localhost. Open the portal at
        <code>https://cmu.quest/portal</code>, or type the Andrew ID below.
      </p>
    </div>
  {:else if !usable}
    <div class="notice">
      <p class="lead">This browser has no camera</p>
      <p>Type the Andrew ID instead &mdash; everything else works.</p>
    </div>
  {:else if fault !== null}
    <div class="notice">
      <p class="lead">Camera unavailable</p>
      <p>{fault}</p>
    </div>
  {:else}
    <div class="view">
      <video bind:this={video} autoplay muted playsinline>
        <track kind="captions" />
      </video>
      <span class="frame" aria-hidden="true"></span>
      {#if paused}
        <span class="held">Paused</span>
      {:else if !live}
        <span class="held">Starting the camera</span>
      {/if}
    </div>

    {#if cameras.length > 1}
      <div class="pick">
        <Field label="Camera">
          <select value={picked} onchange={(event) => (picked = event.currentTarget.value)}>
            <option value="">Rear camera</option>
            {#each cameras as camera, index (camera.deviceId)}
              <option value={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</option>
            {/each}
          </select>
        </Field>
      </div>
    {/if}
  {/if}
</div>

<style>
  .scanner {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .view {
    position: relative;
    display: grid;
    aspect-ratio: 4 / 3;
    width: 100%;
    border-radius: var(--radius-lg);
    background: var(--secondary);
    overflow: hidden;
    place-items: center;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .frame {
    position: absolute;
    inset: 12%;
    border: 3px solid var(--highlight);
    border-radius: var(--radius-lg);
    opacity: 0.85;
  }

  .held {
    position: absolute;
    bottom: 12px;
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    background: var(--highlight);
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  .notice {
    display: grid;
    aspect-ratio: 4 / 3;
    padding: 24px;
    border: 1px dashed var(--muted);
    border-radius: var(--radius-lg);
    background: var(--canvas);
    text-align: center;
    place-content: center;
  }

  .lead {
    margin: 0 0 6px;
    color: var(--ink-shade);
    font-size: 15px;
    font-weight: 800;
  }

  .notice p {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.6;
  }

  .pick {
    max-width: 18rem;
  }
</style>
