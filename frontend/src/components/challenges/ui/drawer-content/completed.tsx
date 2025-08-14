import { Edit3, X } from "lucide-react";
import { useState } from "react";
import type { Challenge } from "@/components/challenges";
import { useApi } from "@/lib/app-context";

interface Completed {
	challenge: Challenge;
}

export function Completed({ challenge }: Completed) {
	const { $api } = useApi();
	const [isEditingNote, setIsEditingNote] = useState(false);
	const [editedNote, setEditedNote] = useState("");

	const { data, refetch } = $api.useQuery(
		"get",
		"/api/journal/{challenge_name}",
		{
			params: {
				path: {
					challenge_name: challenge.name,
				},
			},
		},
	);

	const { mutate: updateNote, isPending: isUpdatingNote } = $api.useMutation(
		"put",
		"/api/journal/{challenge_name}",
		{
			onSuccess: () => {
				setIsEditingNote(false);
				refetch();
			},
		},
	);

	const { mutate: deletePhoto, isPending: isDeletingPhoto } = $api.useMutation(
		"delete",
		"/api/journal/{challenge_name}/photo",
		{
			onSuccess: () => {
				refetch();
			},
		},
	);

	const handleEditNote = () => {
		setEditedNote(data?.entry?.note || "");
		setIsEditingNote(true);
	};

	const handleSaveNote = () => {
		updateNote({
			params: {
				path: {
					challenge_name: challenge.name,
				},
			},
			body: {
				note: editedNote.trim() || null,
			},
		});
	};

	const handleDeletePhoto = () => {
		if (
			confirm(
				"Are you sure you want to delete this photo? This action cannot be undone.",
			)
		) {
			deletePhoto({
				params: {
					path: {
						challenge_name: challenge.name,
					},
				},
			});
		}
	};

	return (
		<>
			<p className="mb-2 text-gray-700 text-sm">
				Congratulations! You've already completed this challenge.
			</p>
			<p className="mb-4 text-gray-500 text-xs">
				Check out your progress in the journal or try other challenges.
			</p>

			{/* Show journal entry if available */}
			{data?.entry && (
				<div className="mb-4 p-4 bg-gray-50 rounded-2xl border-2 border-gray-200">
					<h4 className="text-sm font-semibold text-gray-800 mb-3">
						Your journal entry
					</h4>

					{/* Image */}
					{data.entry.image_url && (
						<div className="mb-3 relative">
							<img
								src={data.entry.image_url}
								alt="Challenge completion memory"
								className="w-full h-48 object-contain rounded-2xl bg-gray-100"
							/>
							<button
								type="button"
								onClick={handleDeletePhoto}
								disabled={isDeletingPhoto}
								className="absolute top-2 right-2 p-1 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-50"
								title="Delete photo"
							>
								<X className="w-4 h-4 text-gray-600" />
							</button>
						</div>
					)}

					{/* Note */}
					<div className="mb-2">
						{isEditingNote ? (
							<div className="space-y-2">
								<textarea
									value={editedNote}
									onChange={(e) => setEditedNote(e.target.value)}
									placeholder="Write about your experience..."
									className="w-full p-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									rows={3}
									maxLength={500}
								/>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleSaveNote}
										disabled={isUpdatingNote}
										className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 disabled:opacity-50"
									>
										{isUpdatingNote ? "Saving..." : "Save"}
									</button>
									<button
										type="button"
										onClick={() => setIsEditingNote(false)}
										className="px-3 py-1.5 text-sm font-medium bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
									>
										Cancel
									</button>
								</div>
							</div>
						) : (
							<div className="flex items-start gap-2">
								<button
									type="button"
									onClick={handleEditNote}
									className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
									title="Edit note"
								>
									<Edit3 className="w-4 h-4" />
								</button>
								{data.entry.note ? (
									<p className="my-auto text-sm text-gray-700 italic flex-1">
										"{data.entry.note}"
									</p>
								) : (
									<p className="my-auto text-sm text-gray-500 italic flex-1">
										No note added
									</p>
								)}
							</div>
						)}
					</div>

					{/* Completion info */}
					<div className="text-xs text-gray-500">
						Completed on {new Date(data.entry.completed_at).toLocaleString()} •{" "}
						{data.entry.coins_earned} coins earned
					</div>
				</div>
			)}

			<button
				type="button"
				disabled
				className="w-full py-2 text-lg font-bold rounded-2xl mb-4 bg-gray-200 text-gray-500 cursor-not-allowed"
			>
				Challenge completed
			</button>
		</>
	);
}
