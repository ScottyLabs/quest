import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAuth } from "@/lib/auth";
import { dormGroups } from "@/lib/data/dorms";

export const Route = createFileRoute("/dorm-select")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
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
	const { $api } = useApi();
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
						{Object.entries(dormGroups).map(([groupName, dorms]) => (
							<optgroup key={groupName} label={groupName}>
								{dorms.map((dorm) => (
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
