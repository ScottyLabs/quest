import { type Category, Poster } from "@/components/poster";

export function App() {
	const demoProps = {
		category: "Off-Campus Adventures" as Category,
		name: "Green Thumb From Phipps",
		tagline: "Visit Phipps Conservatory!",
		secret: "1d|tO/'vAffYf'iN>eO3V4#~qnb,}bpw",
	};

	return <Poster {...demoProps} />;
}
