export {};

export interface RequestUser {
	id: string;
	name: string;
	email: string;
}

declare global {
	namespace Express {
		interface Request {
			user?: RequestUser;
			householdId?: string;
		}
	}
}
