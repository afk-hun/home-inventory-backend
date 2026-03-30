import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import app from "../../app";
import User from "../../models/user";
import Household from "../../models/household";
import ShoppingList from "../../models/shoppingList";

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
	const user = await new User({
		name: "SL User",
		email,
		password: hashed,
	}).save();

	const household = await new Household({
		name: "SL Household",
		owner: user,
		members: [user],
	}).save();

	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });

	return { user, household };
}

async function createListInDb(householdId: Types.ObjectId) {
	return new ShoppingList({
		householdId,
		name: "Test List",
		storeId: new Types.ObjectId(),
		items: [{ itemName: "Milk", quantity: 2, unit: "liter" }],
	}).save();
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

		await createListInDb(household._id as Types.ObjectId);

		// Create a list for a different household — should not appear
		await createListInDb(new Types.ObjectId());

		const csrf = await getCsrf();
		const res = await agent
			.get("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.shoppingLists).toHaveLength(1);
		expect(res.body.shoppingLists[0].name).toBe("Test List");
	});
});

// ---------------------------------------------------------------------------
// GET /shopping-list/shopping-list/:shoppingListId
// ---------------------------------------------------------------------------

describe("GET /shopping-list/shopping-list/:shoppingListId", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${new Types.ObjectId().toHexString()}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 404 for a non-existent id", async () => {
		await loginAsNewUser("sl-get-one-404@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${new Types.ObjectId().toHexString()}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(404);
	});

	it("returns 404 when list belongs to a different household", async () => {
		await loginAsNewUser("sl-get-one-scope@test.com");

		// List created for a different household
		const otherList = await createListInDb(new Types.ObjectId());

		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${otherList._id.toHexString()}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(404);
	});

	it("returns 200 with shoppingList when found", async () => {
		const { household } = await loginAsNewUser("sl-get-one-200@test.com");
		const list = await createListInDb(household._id as Types.ObjectId);

		const csrf = await getCsrf();
		const res = await agent
			.get(`/shopping-list/shopping-list/${list._id.toHexString()}`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.shoppingList).toBeDefined();
		expect(res.body.shoppingList._id).toBe(list._id.toHexString());
		expect(res.body.shoppingList.name).toBe("Test List");
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
			.send({ name: "New List", storeId: new Types.ObjectId().toHexString() });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("sl-create-400-name@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ storeId: new Types.ObjectId().toHexString() });
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
		const csrf = await getCsrf();
		const storeId = new Types.ObjectId().toHexString();
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
		const csrf = await getCsrf();
		const res = await agent
			.post("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ name: "Empty List", storeId: new Types.ObjectId().toHexString() });

		expect(res.status).toBe(201);
		expect(res.body.shoppingList.items).toHaveLength(0);
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
			.send({ shoppingListId: new Types.ObjectId().toHexString() });
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
				shoppingListId: new mongoose.Types.ObjectId().toHexString(),
				name: "Ghost List",
			});
		expect(res.status).toBe(404);
	});

	it("returns 404 when list belongs to a different household", async () => {
		await loginAsNewUser("sl-patch-scope@test.com");
		const otherList = await createListInDb(new Types.ObjectId());

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: otherList._id.toHexString(), name: "Stolen" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with updated shopping list on valid update", async () => {
		const { household } = await loginAsNewUser("sl-patch-200@test.com");
		const list = await createListInDb(household._id as Types.ObjectId);

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: list._id.toHexString(), name: "Renamed List" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Shopping list updated successfully");
		expect(res.body.shoppingList.name).toBe("Renamed List");
	});

	it("returns 200 and updates items array", async () => {
		const { household } = await loginAsNewUser("sl-patch-items@test.com");
		const list = await createListInDb(household._id as Types.ObjectId);
		const newItems = [
			{ itemName: "Bread", quantity: 1, unit: "pcs" },
			{ itemName: "Butter", quantity: 200, unit: "g" },
		];

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: list._id.toHexString(), items: newItems });

		expect(res.status).toBe(200);
		expect(res.body.shoppingList.items).toHaveLength(2);
		expect(res.body.shoppingList.items[0].itemName).toBe("Bread");
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
			.send({ shoppingListId: new Types.ObjectId().toHexString() });
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
			.send({ shoppingListId: new mongoose.Types.ObjectId().toHexString() });
		expect(res.status).toBe(404);
	});

	it("returns 404 when list belongs to a different household", async () => {
		await loginAsNewUser("sl-delete-scope@test.com");
		const otherList = await createListInDb(new Types.ObjectId());

		const csrf = await getCsrf();
		const res = await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: otherList._id.toHexString() });
		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		const { household } = await loginAsNewUser("sl-delete-200@test.com");
		const list = await createListInDb(household._id as Types.ObjectId);

		const csrf = await getCsrf();
		const res = await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: list._id.toHexString() });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Shopping list deleted successfully");
	});

	it("confirms list is gone after deletion", async () => {
		const { household } = await loginAsNewUser("sl-delete-confirm@test.com");
		const list = await createListInDb(household._id as Types.ObjectId);
		const csrf = await getCsrf();

		await agent
			.delete("/shopping-list/shopping-list")
			.set("x-csrf-token", csrf)
			.send({ shoppingListId: list._id.toHexString() });

		const inDb = await ShoppingList.findById(list._id);
		expect(inDb).toBeNull();
	});
});
