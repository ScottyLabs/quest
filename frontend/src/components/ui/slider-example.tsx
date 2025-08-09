import React, { useState } from "react";
import { Slider } from "./slider";

// Example usage of the Slider component
export function SliderExample() {
	const [value1, setValue1] = useState<number>(50);
	const [value2, setValue2] = useState<number>(25);
	const [value3, setValue3] = useState<number>(75);
	const [value4, setValue4] = useState<number>(0);

	return (
		<div className="space-y-6 p-6">
			<div>
				<h3 className="text-lg font-semibold mb-2">Basic Slider (0-100)</h3>
				<Slider
					value={value1}
					onValueChange={setValue1}
					min={0}
					max={100}
					step={1}
					className="max-w-md"
				/>
				<p className="text-sm text-gray-600 mt-2">Current value: {value1}</p>
			</div>

			<div>
				<h3 className="text-lg font-semibold mb-2">
					Slider with Custom Range (0-50)
				</h3>
				<Slider
					value={value2}
					onValueChange={setValue2}
					min={0}
					max={50}
					step={5}
					className="max-w-md"
				/>
				<p className="text-sm text-gray-600 mt-2">Current value: {value2}</p>
			</div>

			<div>
				<h3 className="text-lg font-semibold mb-2">
					Slider with Custom Value Display
				</h3>
				<Slider
					value={value3}
					onValueChange={setValue3}
					min={0}
					max={100}
					step={1}
					valueDisplay={(value) => `${value}%`}
					className="max-w-md"
				/>
				<p className="text-sm text-gray-600 mt-2">
					Current percentage: {value3}%
				</p>
			</div>

			<div>
				<h3 className="text-lg font-semibold mb-2">Disabled Slider</h3>
				<Slider
					value={value4}
					onValueChange={setValue4}
					min={0}
					max={100}
					step={1}
					disabled={true}
					className="max-w-md"
				/>
				<p className="text-sm text-gray-600 mt-2">
					Disabled slider value: {value4}
				</p>
			</div>

			<div>
				<h3 className="text-lg font-semibold mb-2">
					Slider without Value Display
				</h3>
				<Slider
					value={value1}
					onValueChange={setValue1}
					min={0}
					max={100}
					step={1}
					showValue={false}
					className="max-w-md"
				/>
				<p className="text-sm text-gray-600 mt-2">
					Hidden value display - current value: {value1}
				</p>
			</div>
		</div>
	);
}
