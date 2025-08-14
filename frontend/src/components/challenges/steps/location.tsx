import { Loader2, MapPin } from "lucide-react";

interface LocationProps {
	isGettingLocation: boolean;
}

export function Location({ isGettingLocation }: LocationProps) {
	if (!isGettingLocation) return null;

	return (
		<div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
			<div className="flex items-center gap-2">
				{isGettingLocation ? (
					<Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
				) : (
					<MapPin className="w-5 h-5 text-green-600" />
				)}
				<span className="text-sm text-blue-700">Getting your location...</span>
			</div>
		</div>
	);
}
