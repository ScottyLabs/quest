import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

const MascotData: Record<DormName, { mascotName: string; chant: string }> = {
	"Morewood Gardens": {
		mascotName: "Gardens the Sunflower",
		chant: '"What do we need?! Morewood!!"',
	},
	"Morewood E-Tower": {
		mascotName: "Yuxiang the Pineapple",
		chant: '"Who\'s Got The Power?! E-Tower!!"',
	},
	Donner: {
		mascotName: "Donner the Whale",
		chant: '"Yeah, Donner!!"',
	},
	Stever: {
		mascotName: "Stever the Cactus",
		chant:
			'"Brrr...It\'s Cold in here... There must be some Stever in the Atmosphere"',
	},
	Mudge: {
		mascotName: "Mudge the Koi",
		chant: '"Who\'s house? Mudge House!!"',
	},
	"Res on Fifth": {
		mascotName: "Ranch the Flamingo",
		chant: '"Party on what ave?! Fifth Ave!!"\n~Res on Fifth',
	},
	Whesco: {
		mascotName: "Whesco the Penguin",
		chant: '"Let\'s Go, Whesco!!"\n~Henderson, Welch, and Scobell',
	},
	Hammerschlag: {
		mascotName: "Penny the HedgeHog",
		chant: '"Can I get a Hill Yeah?! Hill Yeah!!"\n~Hammerschlag',
	},
	"McGill and Boss": {
		mascotName: "Randal the Red Panda",
		chant: '"Can I get a Hill Yeah?! Hill Yeah!!"\n~Hammerschlag',
	},
	"Margaret Morrison": {
		mascotName: "Aimee the Magpie",
		chant: '"What do we need?! Morisson!!"',
	},
};

function RouteComponent() {
	const { from } = Route.useSearch();
	const { $api } = useApi();
	const navigate = useNavigate();

	const [selectedDorm, setSelectedDorm] = useState<{
		name: DormName;
		image_path: string;
	} | null>(null);
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
		<div className="mx-auto bg-white h-screen flex flex-col border border-gray-300 rounded-lg shadow-lg">
			<div className="px-4 pt-6 pb-2 rounded-t-lg flex-1 content-center">
				{" "}
				{/* Explainer + selected image */}
				<div className="flex justify-center py-2">
					{" "}
					{/* Mascot Image */}
					<img
						src={
							selectedDorm
								? selectedDorm.image_path
								: "images/dorm-mascots/defaultscotty.png"
						}
						alt={`${selectedDorm ? selectedDorm.name : ""} mascot`}
						className="w-48 h-48 object-contain"
					/>
				</div>
				{/* Title & Subtitle */}
				<div className="text-center px-8 pb-6">
					<h1 className="text-xl font-semibold mb-2">
						{selectedDorm
							? MascotData[selectedDorm.name].mascotName
							: "Dorm Mascots"}
					</h1>
					{selectedDorm ? (
						<p className="text-gray-600 text-sm max-w-xs mx-auto">
							{MascotData[selectedDorm.name].chant}
						</p>
					) : (
						<p className="text-gray-600 text-sm max-w-xs mx-auto">
							Every year, all first year dorms compete in the{" "}
							<strong>Carnegie Cup to crown the best house!</strong>
						</p>
					)}
				</div>
			</div>
			<div className="px-4 py-6 flex-none h-[500px]">
				{/* Dorm mascots scroll */}
				<div className="bg-gray-100 w-full rounded-lg py-4 flex-initial shadow-inner overflow-hidden px-4">
					<div className="flex flex-row overflow-x-scroll gap-4">
						{Object.entries(dormGroups).map(([groupName, dorms]) => (
							<div key={groupName}>
								<div
									key={groupName}
									className={
										"flex flex-row items-center rounded-2xl p-2 pb-1 " +
										dormColors[groupName as DormGroup].muted
									}
								>
									{dorms.map((dorm) => (
										<button
											type="button"
											className="m-2 overflow-x-auto scrollbar-hide"
											key={dorm.name}
											onClick={() => {
												setSelectedDorm(dorm);
											}}
										>
											<div
												className={
													"w-[150px] h-[150px] rounded-2xl p-2 pb-3 " +
													dormColors[groupName as DormGroup].selected
												}
											>
												<img
													src={dorm.image_path}
													alt={`${dorm.name} mascot`}
													className={
														"object-contain w-full h-full rounded-2xl " +
														dormColors[groupName as keyof typeof dormColors]
															.light
													}
												/>
											</div>
											<h5 className="block text-center text-md font-semibold h-12 content-center">
												{dorm.name}
											</h5>
										</button>
									))}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Confirm Button */}
				<div className="px-6 py-6">
					<button
						type="button"
						className="w-full bg-red-700 text-white font-semibold py-3 rounded-full hover:bg-red-800 transition"
						onClick={() => selectedDorm && handleSubmit(selectedDorm.name)}
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
}
