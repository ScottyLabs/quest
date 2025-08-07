import { createFileRoute } from "@tanstack/react-router";
import { VerificationList } from "@/components/verification-card";
import { adminMiddleware } from "@/lib/auth";
import { useAdminChallengesForVerify } from "@/lib/hooks/use-challenge-data";

export const Route = createFileRoute("/verify")({
	beforeLoad: async ({ context }) => {
		return await adminMiddleware(context.baseUrl);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { data: challenges, loading, error } = useAdminChallengesForVerify();

	if (loading) {
		return (
			<div className="[view-transition-name:main-content]">
				<div className="p-4 max-w-xl mx-auto">
					<div className="text-center">Loading challenges...</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="[view-transition-name:main-content]">
				<div className="p-4 max-w-xl mx-auto">
					<div className="text-center text-red-500">{error}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="[view-transition-name:main-content]">
			<div className="p-4 max-w-xl mx-auto">
				<h1 className="text-2xl font-bold mb-4">
					Admin Challenge Verification
				</h1>
				<VerificationList challenges={challenges} />
			</div>
		</div>
	);
}
