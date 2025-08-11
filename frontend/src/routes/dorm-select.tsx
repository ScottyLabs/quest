import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAuth } from "@/lib/auth";
import {
	type DormGroup,
	type DormName,
	dormColors,
	dormGroups,
} from "@/lib/data/dorms";

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

	const handleSubmit = async (dormName: DormName) => {
		setError(null);
		updateDormMutation.mutate({
			body: { dorm: dormName },
		});
	};

	return (
		<div className="px-4 pt-6 max-w-xl mx-auto [view-transition-name:main-content]">
			<div className="py-2 bg-[#941120] outline-2 outline-black rounded-lg mb-2 text-center text-white">
				<h1 className="text-2xl font-bold">Select your dorm:</h1>
			</div>
			{error && (
				<div className="py-2 bg-[#941120] outline-2 outline-black rounded-lg mb-2 text-center text-white">
					{error}
				</div>
			)}
			<div className="space-y-3 px-2 py-1 outline-2 rounded-lg bg-[#941120]">
				{Object.entries(dormGroups).map(([groupName, dorms]) =>
					dorms.map((dorm) => (
						<button
							key={dorm.name}
							type="button"
							className={
								"flex w-full items-center my-4 p-3 outline-2 rounded-lg " +
								dormColors[groupName as keyof typeof dormColors].light
							}
							onClick={() => handleSubmit(dorm.name)}
						>
							<img
								src={`${dorm.image_path}`}
								alt={""}
								className={
									"object-contain w-16 h-16 rounded-lg p-1 " +
									dormColors[groupName as DormGroup].primary
								}
							/>
							<div className="text-lg font-semibold p-4">
								{groupName}: {dorm.name}
							</div>
							<ChevronRight className="ml-auto text-gray-500" />
						</button>
					)),
				)}
			</div>
		</div>
	);
}
