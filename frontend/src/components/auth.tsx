import { useApiClient } from "@/lib/api-context";

export function AuthTest() {
	const { $api, login, logout } = useApiClient();
	const { data, error, isPending, refetch } = $api.useQuery(
		"get",
		"/api/profile",
	);

	return (
		<div className="p-4 space-y-4">
			<h2 className="text-xl font-bold">Authentication Test</h2>

			<div className="space-x-2">
				<button
					onClick={() => login()}
					type="button"
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Login
				</button>

				<button
					onClick={() => logout()}
					type="button"
					className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
				>
					Logout
				</button>

				<button
					onClick={() => refetch()}
					disabled={isPending}
					type="button"
					className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
				>
					{isPending ? "Loading..." : "Test Profile API"}
				</button>
			</div>

			<div className="p-4 border rounded">
				<h3 className="font-semibold">Profile Query Status:</h3>
				<div className="mt-2 space-y-2">
					<div>
						Pending: <span className="font-mono">{isPending.toString()}</span>
					</div>
					<div>
						Has Error: <span className="font-mono">{!!error}</span>
					</div>
					<div>
						Has Data: <span className="font-mono">{!!data}</span>
					</div>
				</div>

				{data && (
					<div>
						<h4 className="font-semibold mt-4 text-green-600">Profile Data:</h4>
						<pre className="mt-2 p-2 bg-green-50 rounded text-sm overflow-auto">
							{JSON.stringify(data, null, 2)}
						</pre>
					</div>
				)}

				{error && (
					<div>
						<h4 className="font-semibold mt-4 text-red-600">Error:</h4>
						<pre className="mt-2 p-2 bg-red-50 rounded text-sm overflow-auto">
							{JSON.stringify(error, null, 2)}
						</pre>
					</div>
				)}

				{!isPending && !data && !error && (
					<div className="mt-4 text-yellow-600">
						No data yet - try clicking "Test Profile API" or "Login" first
					</div>
				)}
			</div>
		</div>
	);
}
