import { createId } from "@paralleldrive/cuid2";
import { db } from "./db";
import { households, shelves } from "../db/schema";
import { eq } from "drizzle-orm";

export const seedShoppingBags = () => {
	const allHouseholds = db.select({ id: households.id }).from(households).all();

	for (const { id: householdId } of allHouseholds) {
		const existing = db.query.shelves.findFirst({
			where: (t, { and, eq }) => and(eq(t.householdId, householdId), eq(t.type, "shopping-bag")),
		}).sync();

		if (!existing) {
			db.insert(shelves).values({
				id: createId(),
				householdId,
				name: "Shopping Bag",
				type: "shopping-bag",
			}).run();
			console.log(`[seed] Created Shopping Bag shelf for household ${householdId}`);
		}
	}
};
