import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import app from "../../app";
import { db } from "../../lib/db";
import { householdMembers, households, users } from "../../db/schema";

let agent: ReturnType<typeof request.agent>;

beforeEach(() => {
	agent = request.agent(app);
});

async function getCsrf() {
	const res = await agent.get("/auth/csrf-token");
	return res.body.csrfToken as string;
}

async function loginAsNewUser(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const userId = createId();
	const householdId = createId();

	db.insert(users).values({
		id: userId,
		name: "Favorite User",
		email,
		password: hashed,
	}).run();

	db.insert(households).values({
		id: householdId,
		name: "Favorite Household",
		ownerId: userId,
	}).run();

	db.insert(householdMembers).values({
		householdId,
		userId,
	}).run();

	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });

	return { userId, householdId };
}

async function createItem(name: string) {
	const csrf = await getCsrf();
	const res = await agent
		.post("/shelf/item")
		.set("x-csrf-token", csrf)
		.send({ name });

	expect(res.status).toBe(201);
	return res.body.item._id as string;
}

async function createShelf(name: string) {
	const csrf = await getCsrf();
	const res = await agent
		.post("/shelf/shelf")
		.set("x-csrf-token", csrf)
		.send({ name });

	expect(res.status).toBe(201);
	return res.body.shelf._id as string;
}

async function addItemToShelf(shelfId: string, itemId: string, quantity: number, unit?: string) {
	const csrf = await getCsrf();
	const res = await agent
		.post("/shelf/shelf/add-item")
		.set("x-csrf-token", csrf)
		.send({ shelfId, itemId, quantity, unit });

	expect(res.status).toBe(200);
	return res.body.shelf;
}

describe("favorite items", () => {
	it("adds, lists, and removes a favorite item", async () => {
		await loginAsNewUser("favorite-flow@test.com");
		const itemId = await createItem("Rice");

		const addCsrf = await getCsrf();
		const addRes = await agent
			.post("/shelf/item/favorite")
			.set("x-csrf-token", addCsrf)
			.send({ itemId });

		expect(addRes.status).toBe(201);
		expect(addRes.body.isFavorite).toBe(true);

		const listCsrf = await getCsrf();
		const listRes = await agent
			.get("/shelf/item/favorite")
			.set("x-csrf-token", listCsrf);

		expect(listRes.status).toBe(200);
		expect(listRes.body.favorites).toHaveLength(1);
		expect(listRes.body.favorites[0]).toMatchObject({
			_id: itemId,
			name: "Rice",
			isFavorite: true,
			isAvailable: false,
			quantity: null,
			unit: null,
		});

		const removeCsrf = await getCsrf();
		const removeRes = await agent
			.delete("/shelf/item/favorite")
			.set("x-csrf-token", removeCsrf)
			.send({ itemId });

		expect(removeRes.status).toBe(200);
		expect(removeRes.body.isFavorite).toBe(false);
	});

	it("marks favorite state in the item list response", async () => {
		await loginAsNewUser("favorite-list@test.com");
		const itemId = await createItem("Pasta");

		const favoriteCsrf = await getCsrf();
		await agent
			.post("/shelf/item/favorite")
			.set("x-csrf-token", favoriteCsrf)
			.send({ itemId });

		const listCsrf = await getCsrf();
		const listRes = await agent
			.get("/shelf/item")
			.set("x-csrf-token", listCsrf);

		expect(listRes.status).toBe(200);
		expect(listRes.body.items[0]).toMatchObject({
			_id: itemId,
			isFavorite: true,
		});
	});

	it("decrements one unit from the favorite item stock", async () => {
		await loginAsNewUser("favorite-remove-one@test.com");
		const itemId = await createItem("Milk");
		const shelfId = await createShelf("Fridge");
		await addItemToShelf(shelfId, itemId, 3, "pc");

		const favoriteCsrf = await getCsrf();
		await agent
			.post("/shelf/item/favorite")
			.set("x-csrf-token", favoriteCsrf)
			.send({ itemId });

		const removeOneCsrf = await getCsrf();
		const removeOneRes = await agent
			.post("/shelf/item/favorite/remove-one")
			.set("x-csrf-token", removeOneCsrf)
			.send({ itemId });

		expect(removeOneRes.status).toBe(200);
		expect(removeOneRes.body.favorite).toMatchObject({
			_id: itemId,
			isAvailable: true,
			quantity: 2,
			unit: "pc",
		});
	});

	it("returns the requested unavailable message when a favorite has no shelf stock", async () => {
		await loginAsNewUser("favorite-unavailable@test.com");
		const itemId = await createItem("Beans");

		const favoriteCsrf = await getCsrf();
		await agent
			.post("/shelf/item/favorite")
			.set("x-csrf-token", favoriteCsrf)
			.send({ itemId });

		const removeOneCsrf = await getCsrf();
		const removeOneRes = await agent
			.post("/shelf/item/favorite/remove-one")
			.set("x-csrf-token", removeOneCsrf)
			.send({ itemId });

		expect(removeOneRes.status).toBe(409);
		expect(removeOneRes.body.message).toBe("This item is not available at home.");
	});
});