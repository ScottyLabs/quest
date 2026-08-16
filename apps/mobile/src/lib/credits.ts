import doc from "./data/credits.json" with { type: "json" };

export interface Member {
  name: string;
  school: string;
  roles: string[];
  year?: string;
}

export interface CreditGroup {
  id: string;
  title: string;
  past?: boolean;
  members: Member[];
  specialThanks?: string[];
}

export const INTRO: string = doc.intro;

export const CREDIT_GROUPS: CreditGroup[] = doc.groups;

export function monogram(name: string): string {
  return name
    .split(/\s+/u)
    .filter((part) => /^\p{L}/u.test(part))
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
