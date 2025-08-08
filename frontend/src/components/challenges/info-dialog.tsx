import { Info } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface InfoDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	pageObjectLabel: string;
}

export function InfoDialog({
	isOpen,
	onOpenChange,
	pageObjectLabel,
}: InfoDialogProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md bg-white border-none shadow-[0_3px_0_#bbb]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Info className="size-5 text-blue-600" />
						About {pageObjectLabel}
					</DialogTitle>
					<DialogDescription>
						Learn more about this category and how to complete challenges.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 rounded-lg">
					<div>
						<h4 className="font-semibold text-gray-900 mb-2">How it works:</h4>
						<ul className="text-sm text-gray-600 space-y-1">
							<li>&#x2022; Complete challenges to earn ScottyCoins</li>
							<li>&#x2022; Use filters to find specific types of challenges</li>
							<li>&#x2022; Track your progress across all categories</li>
						</ul>
					</div>

					<div>
						<h4 className="font-semibold text-gray-900 mb-2">
							Challenge Types:
						</h4>
						<ul className="text-sm text-gray-600 space-y-1">
							<li>
								&#x2022; <span className="font-medium">Available:</span> Ready
								to complete
							</li>
							<li>
								&#x2022; <span className="font-medium">Locked:</span> Not yet
								unlocked
							</li>
							<li>
								&#x2022; <span className="font-medium">Completed:</span> Already
								finished
							</li>
						</ul>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
