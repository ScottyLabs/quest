import doc from "./data/info.json" with { type: "json" };

export interface InfoTile {
  id: string;
  label: string;
  icon: string;
  url: string;
}

export const UPDATED: string = doc.updated;

export const INFO_TILES: InfoTile[] = doc.tiles;
