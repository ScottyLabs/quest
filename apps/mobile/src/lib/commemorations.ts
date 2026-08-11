import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";

const SHELF = "commemorations";

async function shelf(): Promise<void> {
  await Filesystem.mkdir({ path: SHELF, directory: Directory.Data, recursive: true }).catch(
    () => undefined,
  );
}

export async function commemorate(challengeId: string): Promise<void> {
  const shot = await Camera.takePhoto({
    correctOrientation: true,
    quality: 85,
  });

  await shelf();

  const dest = `${SHELF}/${challengeId}-${Date.now()}.jpeg`;

  if (Capacitor.isNativePlatform() && shot.uri !== undefined) {
    await Filesystem.copy({ from: shot.uri, to: dest, toDirectory: Directory.Data });
    return;
  }

  const source = shot.webPath ?? shot.uri;
  if (source === undefined) return;

  const blob = await (await fetch(source)).blob();
  await Filesystem.writeFile({ path: dest, data: blob, directory: Directory.Data });
}

function scribble(challengeId: string): string {
  return `${SHELF}/${challengeId}.txt`;
}

export async function readNote(challengeId: string): Promise<string> {
  const found = await Filesystem.readFile({
    path: scribble(challengeId),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  }).catch(() => null);

  return typeof found?.data === "string" ? found.data : "";
}

export async function saveNote(challengeId: string, text: string): Promise<void> {
  await shelf();
  await Filesystem.writeFile({
    path: scribble(challengeId),
    data: text,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
}
