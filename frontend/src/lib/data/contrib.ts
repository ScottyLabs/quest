interface Contributor {
	firstName: string;
	lastName: string;
	role: string;
	major: string;
	grad_year: number;
	contribution_year: number;
}

export const contributors: Contributor[] = [
	{
		firstName: "Kenechukwu",
		lastName: "Echezona",
		role: "Project Lead",
		major: "SCS",
		grad_year: 2026,
		contribution_year: 2025,
	},
	{
		firstName: "Anish",
		lastName: "Pallati",
		role: "Developer",
		major: "MCS",
		grad_year: 2028,
		contribution_year: 2025,
	},
	{
		firstName: "Autumn",
		lastName: "Qiu",
		role: "Developer",
		major: "IS",
		grad_year: 2027,
		contribution_year: 2025,
	},
	{
		firstName: "Theo",
		lastName: "Urban",
		role: "Developer",
		major: "SCS",
		grad_year: 2026,
		contribution_year: 2025,
	},
	{
		firstName: "Jeffery",
		lastName: "Wang",
		role: "Developer",
		major: "BXA",
		grad_year: 2027,
		contribution_year: 2025,
	},
];

// Reverse lookups
export const contributorsByYear = contributors.reduce(
	(acc, contributor) => {
		const year = contributor.contribution_year;
		if (!acc[year]) {
			acc[year] = [];
		}
		acc[year].push(contributor);
		return acc;
	},
	{} as Record<number, Contributor[]>,
);
