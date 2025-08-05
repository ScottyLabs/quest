import { useNavigate } from "@tanstack/react-router";
import { CHALLENGE_COLORS } from "@/routes/challenges";

interface CategoryTabsProps {
	categories: string[];
	selectedCategory: string;
}

export function CategoryTabs({
	categories,
	selectedCategory,
}: CategoryTabsProps) {
	const navigate = useNavigate();

	const handleCategoryClick = (cat: string) => {
		navigate({
			to: "/challenges",
			search: { category: cat },
		});
	};

	return (
		<div
			className="mb-6 rounded-lg p-2 overflow-x-scroll"
			style={{ background: CHALLENGE_COLORS[selectedCategory] }}
		>
			<div className="flex gap-2">
				{categories.map((cat) => (
					<button
						type="button"
						key={cat}
						onClick={() => handleCategoryClick(cat)}
						className={`px-3 py-1 text-nowrap rounded-md text-sm font-medium transition-colors ${
							selectedCategory === cat
								? "bg-[#00000033] text-white"
								: "text-white"
						}`}
					>
						{cat === "all" ? "All" : cat}
					</button>
				))}
			</div>
		</div>
	);
}
