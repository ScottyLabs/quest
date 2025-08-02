import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useApiClient } from "@/lib/api-context";
import { requireAuth } from "@/lib/auth";

const DORM_GROUPS = [
	{
		name: "Morewood + E-Tower",
		dorms: ["Morewood Gardens", "Morewood E-Tower"],
	},
	{
		name: "Donner + West Wing",
		dorms: ["Donner", "West Wing"],
	},
	{
		name: "Stever",
		dorms: ["Stever"],
	},
	{
		name: "Mudge",
		dorms: ["Mudge"],
	},
	{
		name: "Res on Fifth",
		dorms: ["Res on Fifth"],
	},
	{
		name: "The Hill",
		dorms: ["Whesco", "Hammerschlag", "McGill and Boss"],
	},
] as const;

export const Route = createFileRoute("/dorm-select")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context.baseUrl);
	},
	validateSearch: (search: Record<string, unknown>) => {
		return {
			from: typeof search.from === "string" ? search.from : undefined,
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { from } = Route.useSearch();
	const { $api } = useApiClient();
	const navigate = useNavigate();

	const [selectedDorm, setSelectedDorm] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

	const updateDormMutation = $api.useMutation("put", "/api/profile/dorm", {
		onSuccess: () => {
			// Navigate to the original destination
			navigate({ to: from || "/" });
		},
		onError: () => {
			setError("Failed to update dorm");
		},
	});

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!selectedDorm.trim()) {
			setError("Please select a dorm");
			return;
		}

		setError(null);
		updateDormMutation.mutate({
			body: { dorm: selectedDorm },
		});
	};

	return (
		<div className="[view-transition-name:main-content]">
			<form onSubmit={handleSubmit}>
				<div>
					<label htmlFor="dorm-select">Select your dorm:</label>

					<select
						id="dorm-select"
						value={selectedDorm}
						onChange={(e) => setSelectedDorm(e.target.value)}
						disabled={updateDormMutation.isPending}
					>
						{DORM_GROUPS.map((group) => (
							<optgroup key={group.name} label={group.name}>
								{group.dorms.map((dorm) => (
									<option key={dorm} value={dorm}>
										{dorm}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</div>

				{error && <div>{error}</div>}

				<button
					type="submit"
					disabled={updateDormMutation.isPending || !selectedDorm.trim()}
				>
					{updateDormMutation.isPending ? "Saving..." : "Continue to O-Quest"}
				</button>
			</form>
		</div>
	);
}
