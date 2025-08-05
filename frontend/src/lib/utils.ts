import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const snakeToCamel = (str: string) =>
	str
		.toLowerCase()
		.replace(/([-_][a-z])/g, (group) =>
			group.toUpperCase().replace("-", "").replace("_", ""),
		);
export const snakeToCamelObject = (obj: Record<string, any>) => {
	const newObj: Record<string, any> = {};
	for (const key in obj) {
		if (Object.hasOwn(obj, key)) {
			const newKey = snakeToCamel(key);
			newObj[newKey] = obj[key];
			// Recursively convert nested objects
			if (typeof obj[key] === "object" && obj[key] !== null) {
				newObj[newKey] = snakeToCamelObject(obj[key]);
			}
		}
	}
	return newObj;
};
