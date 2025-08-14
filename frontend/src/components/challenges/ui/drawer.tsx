import { Link } from "@tanstack/react-router";
import { ExternalLink, MapPin } from "lucide-react";
import {
	type Dispatch,
	type PropsWithChildren,
	type SetStateAction,
	useState,
} from "react";
import { Drawer } from "vaul";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import {
	type CategoryLabel,
	categoryIdFromLabel,
	colorClasses,
} from "@/lib/data/categories";
import type { Challenge } from "./card";

interface DrawerProps {
	open: boolean;
	setOpen: Dispatch<SetStateAction<boolean>>;
	challenge: Challenge;
	isVerifyMode?: boolean;
}

export const ChallengeDrawer = ({
	open,
	setOpen,
	challenge,
	isVerifyMode,
	children,
}: PropsWithChildren<DrawerProps>) => {
	const [showDescription, setShowDescription] = useState(false);

	const label = (challenge: Challenge) =>
		categoryIdFromLabel[challenge.category as CategoryLabel];

	const unlockedAt = challenge?.unlock_timestamp
		? new Date(challenge.unlock_timestamp).toLocaleString()
		: null;

	return (
		<Drawer.Root open={open} onOpenChange={setOpen}>
			<Drawer.Portal>
				<Drawer.Overlay className="z-50 fixed inset-0 bg-black/40" />
				{challenge && (
					<Drawer.Content className="z-50 bg-white flex flex-col fixed bottom-0 left-0 right-0 h-[82vh] rounded-t-2xl">
						<div className="flex-none px-6 pt-4 pb-2">
							<Drawer.Handle />
						</div>

						<div className="flex-1 overflow-y-auto px-6 pb-6">
							<div className="flex justify-between">
								<Link
									to="/challenges/$categoryId"
									params={{
										categoryId: label(challenge),
									}}
									className={`px-3 py-1 mt-4 mb-2 text-sm w-fit rounded-full ${colorClasses[label(challenge)].pill}`}
									onClick={() => setOpen(false)}
								>
									{challenge.category}
								</Link>

								{!isVerifyMode && (
									<div className="flex my-auto translate-y-1/4 items-center w-20 justify-end text-sm font-bold gap-2">
										<ScottyCoin className="size-5" />
										<span>+{challenge.scotty_coins}</span>
									</div>
								)}
							</div>
							<Drawer.Title className="text-2xl font-bold mb-1">
								{challenge.name}
							</Drawer.Title>

							<div className="flex justify-start items-center text-default gap-1 mb-4">
								<MapPin className="size-4" />

								<a
									href={challenge.maps_link ?? "https://cmumaps.com"}
									target="_blank"
									rel="noopener noreferrer"
									className="justify-start text-base font-semibold underline tracking-tight"
								>
									{challenge.location}
								</a>
							</div>
							<div className="bg-gray-50 rounded-2xl p-4 shadow-[0_3px_0_#bbb] border-2 border-[#bbb] mb-4">
								<div className="text-sm text-gray-700 mb-1">
									{(() => {
										const desc = challenge.description ?? "";
										const limit = 300;
										const isLong = desc.length > limit;

										if (!isLong) {
											return <div>{desc}</div>;
										}

										return showDescription ? (
											<div>
												{desc}{" "}
												<button
													type="button"
													className="font-semibold cursor-pointer underline"
													onClick={() => setShowDescription(false)}
												>
													(less)
												</button>
											</div>
										) : (
											<div>
												{desc.slice(0, limit)}...{" "}
												<button
													type="button"
													className="font-semibold cursor-pointer underline"
													onClick={() => setShowDescription(true)}
												>
													(more)
												</button>
											</div>
										);
									})()}
								</div>

								{challenge.more_info_link && (
									<div className="text-sm flex justify-start items-center text-default gap-1">
										<a
											href={challenge.more_info_link}
											target="_blank"
											rel="noopener noreferrer"
											className="justify-start text-base font-semibold underline tracking-tight"
										>
											Learn More
										</a>

										<ExternalLink className="size-4" />
									</div>
								)}
							</div>

							{children}

							<small className="text-xs italic text-gray-500 block">
								This challenge was unlocked at {unlockedAt}.
							</small>
						</div>
					</Drawer.Content>
				)}
			</Drawer.Portal>
		</Drawer.Root>
	);
};
