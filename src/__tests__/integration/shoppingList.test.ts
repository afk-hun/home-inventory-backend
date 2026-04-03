import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import app from "../../app";

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
	const user = await prisma.user.create({ data: { name: "SL User", email, password: hashed } });
	const household = await prisma.household.create({ data: { name: "SL Household", ownerId: user.id } });
	await prisma.householdMember.create({ data: { householdId: household.id, userId: user.id } });
	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });
	return { user, household };
}

async function createListInDb(householdId: string) {
	const store = await prisma.store.create({ data: { name: "Test Store", householdId } });
	return prisma.shoppingList.create({
		data: {
			name: "Test List",
			householdId,
			storeId: store.id,
			items: { create: [{ itemName: "Milk", quantity: 2, unit: "liter", checked: false }] },
		},
		include: { items: true },
	});
}

async function createOrphanList() {
	const user = await prisma.user.create({
		data: { name: "Orphan", email: `orphan-${Date.now()}@test.com`, password: "x" },
	});
	const household = await prisma.household.create({ data: { name: "Orphan HH", ownerId: user.id } });
	await prisma.householdMember.create({ data: { householdId: household.id, userId: user.id } });
	return createListInDb(household.id);
}

// ---------------------------------------------------------------------------
// GET /shopping-list/shopping-list
// ---------------------------------------------------------------------------

describe("GET /shopping-list/shopping-list", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with empty shoppingLists array when authenticated and no lists exist", async () => {
		await loginAsNewUser("sl-get-200@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.get("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.shoppingLists)).toBe(true);
		expect(res.body.shoppingLists).toHaveLength(0);
	});

	it("returns only shopping lists belonging to the authenticated household", async () => {
		const { household } = await loginAsNewUser("sl-get-scope@test.com");

		await createListInDb(household.id);

		// Create a list for a different household — should not appear
		await createOrphanList();

		const csrf = await getCsrf();
		const res = await agent
			.get("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.shoppingLists).toHaveLength(1);
		expect(res.body.shoppingLists[0].name).toBe("Test List");
	});

	it("returns items with checked field in the list response", async () => {
		const { household } = await loginAsNewUser("sl-get-checked@test.com");
		await createListInDb(household.id);

		const csrf = await getCsrf();
		const res = await agent
			.get("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.shoppingLists[0].items[0].checked).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// GET /shopping-list/shopping-list/:shoppingListId
// ---------------------------------------------------------------------------

describe("GET /shopping-list/shopping-list/:shoppingListId", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${"nonexistent-id"}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 404 for a non-existent id", async () => {
		await loginAsNewUser("sl-get-one-404@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${"nonexistent-id"}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(404);
	});

	it("returns 404 when list belongs to a different household", async () => {
		await loginAsNewUser("sl-get-one-scope@test.com");

		// List created for a different household
		const otherList = await createOrphanList();

		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${otherList.id}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(404);
	});

	it("returns 200 with shoppingList when found", async () => {
		const { household } = await loginAsNewUser("sl-get-one-200@test.com");
		const list = await createListInDb(household.id);

		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${list.id}`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.shoppingList).toBeDefined();
		expect(res.body.shoppingList._id).toBe(list.id);
		expect(res.body.shoppingList.name).toBe("Test List");
	});

	it("returns items with checked field in single list response", async () => {
		const { household } = await loginAsNewUser("sl-get-one-checked@test.com");
		const list = await createListInDb(household.id);

		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${list.id}`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.shoppingList.items[0].checked).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// POST /shopping-list/shopping-list
// ---------------------------------------------------------------------------

describe("POST /shopping-list/shopping-list", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ name: "New List", storeId: "nonexistent-id" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("sl-create-400-name@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ storeId: "nonexistent-id" });
		expect(res.status).toBe(400);
	});

	it("returns 400 when storeId is missing", async () => {
		await loginAsNewUser("sl-create-400-store@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ name: "My List" });
		expect(res.status).toBe(400);
	});

	it("returns 201 with created shopping list", async () => {
		await loginAsNewUser("sl-create-201@test.com");
		let csrf = await getCsrf();
		const storeRes = await agent.post("/store/store").set("x-csrf-token", csrf).send({ name: "Test Store" });
		const storeId = storeRes.body.store._id;
		csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({
				name: "Weekend Shop",
				storeId,
				items: [{ itemName: "Eggs", quantity: 12, unit: "pcs" }],
			});

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Shopping list created!");
		expect(res.body.shoppingList).toBeDefined();
		expect(res.body.shoppingList.name).toBe("Weekend Shop");
		expect(res.body.shoppingList._id).toBeDefined();
		expect(res.body.shoppingList.items).toHaveLength(1);
		expect(res.body.shoppingList.items[0].itemName).toBe("Eggs");
	});

	it("returns 201 with empty items when items not provided", async () => {
		await loginAsNewUser("sl-create-201-no-items@test.com");
		let csrf = await getCsrf();
		const storeRes = await agent.post("/store/store").set("x-csrf-token", csrf).send({ name: "Test Store" });
		const storeId = storeRes.body.store._id;
		csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ name: "Empty List", storeId });

		expect(res.status).toBe(201);
		expect(res.body.shoppingList.items).toHaveLength(0);
	});

	it("returns 201 and items have checked defaulting to false when not supplied", async () => {
		await loginAsNewUser("sl-create-checked-default@test.com");
		let csrf = await getCsrf();
		const storeRes = await agent.post("/store/store").set("x-csrf-token", csrf).send({ name: "Test Store" });
		const storeId = storeRes.body.store._id;
		csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({
				name: "Checked Default Test",
				storeId,
				items: [{ itemName: "Apples", quantity: 4, unit: "pcs" }],
			});

		expect(res.status).toBe(201);
		expect(res.body.shoppingList.items[0].checked).toBe(false);
	});

	it("returns 201 and persists checked: true when explicitly set", async () => {
		await loginAsNewUser("sl-create-checked-true@test.com");
		let csrf = await getCsrf();
		const storeRes = await agent.post("/store/store").set("x-csrf-token", csrf).send({ name: "Test Store" });
		const storeId = storeRes.body.store._id;
		csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({
				name: "Pre-checked List",
				storeId,
				items: [{ itemName: "Milk", quantity: 1, unit: "liter", checked: true }],
			});

		expect(res.status).toBe(201);
		expect(res.body.shoppingList.items[0].checked).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// PATCH /shopping-list/shopping-list
// ---------------------------------------------------------------------------

describe("PATCH /shopping-list/shopping-list", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: "nonexistent-id" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when shoppingListId is missing", async () => {
		await loginAsNewUser("sl-patch-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ name: "No ID" });
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent id", async () => {
		await loginAsNewUser("sl-patch-404@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({
				shoppingListId: "nonexistent-id",
				name: "Ghost List",
			});
		expect(res.status).toBe(404);
	});

	it("returns 404 when list belongs to a different household", async () => {
		await loginAsNewUser("sl-patch-scope@test.com");
		const otherList = await createOrphanList();

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: otherList.id, name: "Stolen" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with updated shopping list on valid update", async () => {
		const { household } = await loginAsNewUser("sl-patch-200@test.com");
		const list = await createListInDb(household.id);

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: list.id, name: "Renamed List" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Shopping list updated successfully");
		expect(res.body.shoppingList.name).toBe("Renamed List");
	});

	it("returns 200 and updates items array", async () => {
		const { household } = await loginAsNewUser("sl-patch-items@test.com");
		const list = await createListInDb(household.id);
		const newItems = [
			{ itemName: "Bread", quantity: 1, unit: "pcs" },
			{ itemName: "Butter", quantity: 200, unit: "g" },
		];

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: list.id, items: newItems });

		expect(res.status).toBe(200);
		expect(res.body.shoppingList.items).toHaveLength(2);
		expect(res.body.shoppingList.items[0].itemName).toBe("Bread");
	});

	it("returns 200 and updates checked field on existing item", async () => {
		const { household } = await loginAsNewUser("sl-patch-checked@test.com");
		const list = await createListInDb(household.id);

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({
				shoppingListId: list.id,
				items: [{ itemName: "Milk", quantity: 2, unit: "liter", checked: true }],
			});

		expect(res.status).toBe(200);
		expect(res.body.shoppingList.items[0].checked).toBe(true);
	});

	it("returns 200 and items default checked to false when not supplied in patch", async () => {
		const { household } = await loginAsNewUser("sl-patch-checked-default@test.com");
		const list = await createListInDb(household.id);

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({
				shoppingListId: list.id,
				items: [{ itemName: "Juice", quantity: 1, unit: "bottle" }],
			});

		expect(res.status).toBe(200);
		expect(res.body.shoppingList.items[0].checked).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// DELETE /shopping-list/shopping-list
// ---------------------------------------------------------------------------

describe("DELETE /shopping-list/shopping-list", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: "nonexistent-id" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when shoppingListId is missing", async () => {
		await loginAsNewUser("sl-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent id", async () => {
		await loginAsNewUser("sl-delete-404@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: "nonexistent-id" });
		expect(res.status).toBe(404);
	});

	it("returns 404 when list belongs to a different household", async () => {
		await loginAsNewUser("sl-delete-scope@test.com");
		const otherList = await createOrphanList();

		const csrf = await getCsrf();
		const res = await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: otherList.id });
		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		const { household } = await loginAsNewUser("sl-delete-200@test.com");
		const list = await createListInDb(household.id);

		const csrf = await getCsrf();
		const res = await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: list.id });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Shopping list deleted successfully");
	});

	it("confirms list is gone after deletion", async () => {
		const { household } = await loginAsNewUser("sl-delete-confirm@test.com");
		const list = await createListInDb(household.id);
		const csrf = await getCsrf();

		await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: list.id });

		const inDb = await prisma.shoppingList.findUnique({ where: { id: list.id } });
		expect(inDb).toBeNull();
	});
});
