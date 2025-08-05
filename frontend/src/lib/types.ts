export type User = {
	name: string;
	andrewId: string;
	points: number;
};

export type LeaderboardUser = User & {
	place: number;
};

export type House = {
	name: string;
	dorm: string;
};

export type ImageInfo = {
	id: string;
	title: string;
	src: string;
	alt: string;
};

export type ChallengeSummary = {
	total: number;
	byCategory: Record<CategoryName, number>;
};

export type CategoryName =
	| "Off-campus"
	| "On-campus"
	| "Events"
	| "Academics"
	| "Service";

// {
//   "userId": "devuser",
//   "dorm": "Morewood E-Tower",
//   "name": "Dev User",
//   "scottyCoins": {
//     "current": 0,
//     "total_earned": 0,
//     "total_spent": 0
//   },
//   "groups": [
//     "O-Quest Admin"
//   ],
//   "leaderboardPosition": 2,
//   "challengesCompleted": {
//     "total": 0,
//     "by_category": {}
//   },
//   "totalChallenges": {
//     "total": 0,
//     "by_category": {}
//   },
//   "recentActivityDays": [],
//   "house": {
//     "dorm": "Morewood E-Tower",
//     "name": "Morewood + E-Tower"
//   }
// }

export type CoinCount = {
	current: number;
	totalEarned: number;
	totalSpent: number;
};

export type UserProfile = {
	avatarUrl: string;
	name: string;
	userId: string;
	house: House;
	scottyCoins: CoinCount;
	challengesCompleted: ChallengeSummary;
	totalChallenges: ChallengeSummary;
	leaderboardPosition: number;
	categoryCompletions: Record<CategoryName, number>;
	gallery: ImageInfo[];
	prizes: ImageInfo[];
	stamps: boolean[];
};

export type GetProfileResponse = {
	avatarUrl: string;
	name: string;
	userId: string;
	dorm: string;
	recentActivityDays: string[];
	scottyCoins: CoinCount;
	challengesCompleted: ChallengeSummary;
	totalChallenges: ChallengeSummary;
	leaderboardPosition: number;
	gallery: ImageInfo[];
	prizes: ImageInfo[];
};

export type Challenge = {
	id: number;
	name: string;
	description: string;
	coins_earned_for_completion: number;
	completed: boolean;
	unlocked: boolean;
	unlock_date: string;
};

export type ChallengeCategoryData = {
	name: string;
	completed: number;
	total: number;
	color: string;
	flagColor: string;
};

export type ChallengeData = {
	categories: ChallengeCategoryData[];
	totalCompleted: number;
	totalChallenges: number;
};
