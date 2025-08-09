import { Heart, Minus, Plus, Star } from "lucide-react";
import { CountItem } from "./count-item";

/**
 * Example usage of the CountItem component
 * This file demonstrates different ways to use the CountItem component
 */
export function CountItemExamples() {
	return (
		<div className="space-y-4 p-4">
			<h2 className="text-2xl font-bold">CountItem Examples</h2>

			{/* Basic usage */}
			<div>
				<h3 className="text-lg font-semibold mb-2">Basic Usage</h3>
				<CountItem count={14} />
			</div>

			{/* With icons */}
			<div>
				<h3 className="text-lg font-semibold mb-2">With Icons</h3>
				<div className="flex gap-4">
					<CountItem
						count={14}
						leftIcon={<Minus className="w-4 h-4" />}
						rightIcon={<Plus className="w-4 h-4" />}
					/>
					<CountItem
						count={5}
						leftIcon={<Star className="w-4 h-4" />}
						rightIcon={<Heart className="w-4 h-4" />}
					/>
				</div>
			</div>

			{/* Custom colors */}
			<div>
				<h3 className="text-lg font-semibold mb-2">Custom Colors</h3>
				<div className="flex gap-4">
					<CountItem
						count={14}
						leftIcon={<Minus className="w-4 h-4" />}
						rightIcon={<Plus className="w-4 h-4" />}
						backgroundColor="bg-blue-500"
						textColor="text-white"
						shadowColor="shadow-[0px_4px_0px_0px_rgba(59,130,246,1.00)]"
						outlineColor="outline-blue-600"
					/>
					<CountItem
						count={7}
						leftIcon={<Star className="w-4 h-4" />}
						rightIcon={<Heart className="w-4 h-4" />}
						backgroundColor="bg-green-500"
						textColor="text-white"
						shadowColor="shadow-[0px_4px_0px_0px_rgba(34,197,94,1.00)]"
						outlineColor="outline-green-600"
					/>
					<CountItem
						count={23}
						leftIcon={<Minus className="w-4 h-4" />}
						rightIcon={<Plus className="w-4 h-4" />}
						backgroundColor="bg-purple-500"
						textColor="text-white"
						shadowColor="shadow-[0px_4px_0px_0px_rgba(168,85,247,1.00)]"
						outlineColor="outline-purple-600"
					/>
				</div>
			</div>

			{/* Different styles */}
			<div>
				<h3 className="text-lg font-semibold mb-2">Different Styles</h3>
				<div className="flex gap-4">
					<CountItem
						count={42}
						backgroundColor="bg-gray-800"
						textColor="text-white"
						shadowColor="shadow-[0px_4px_0px_0px_rgba(31,41,55,1.00)]"
						outlineColor="outline-gray-700"
					/>
					<CountItem
						count={99}
						backgroundColor="bg-red-500"
						textColor="text-white"
						shadowColor="shadow-[0px_4px_0px_0px_rgba(239,68,68,1.00)]"
						outlineColor="outline-red-600"
					/>
					<CountItem
						count={3}
						backgroundColor="bg-yellow-400"
						textColor="text-black"
						shadowColor="shadow-[0px_4px_0px_0px_rgba(250,204,21,1.00)]"
						outlineColor="outline-yellow-500"
					/>
				</div>
			</div>
		</div>
	);
}
