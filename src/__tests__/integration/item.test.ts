import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../../app";
import User from "../../models/user";
import Household from "../../models/household";

let agent: ReturnType<typeof request.agent>;

beforeEach(() => {
	agent = request.agent(app);
});

async function getCsrf() {
	const res = await agent.get("/auth/csrf-token");
	return res.body.csrfToken as string;
}

/** Creates a user + household in DB, logs in via HTTP. */
async function loginAsNewUser(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const user = await new User({
		name: "Item User",
		email,
		password: hashed,
	}).save();

	await new Household({
		name: "Item Household",
		owner: user,
		members: [user],
	}).save();

	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });

	return user;
}

// ---------------------------------------------------------------------------
// GET /shelf/item
// ---------------------------------------------------------------------------

describe("GET /shelf/item", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent.get("/shelf/item").set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with items array and pagination when authenticated", async () => {
		await loginAsNewUser("item-get@test.com");
		const csrf = await getCsrf();
		const res = await agent.get("/shelf/item").set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.items)).toBe(true);
		expect(res.body.pagination).toBeDefined();
		expect(typeof res.body.pagination.total).toBe("number");
		expect(typeof res.body.pagination.page).toBe("number");
		expect(typeof res.body.pagination.limit).toBe("number");
		expect(typeof res.body.pagination.totalPages).toBe("number");
	});
});

// ---------------------------------------------------------------------------
// GET /shelf/item/:id
// ---------------------------------------------------------------------------

describe("GET /shelf/item/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.get(`/shelf/item/${fakeId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 404 for a non-existent id", async () => {
		await loginAsNewUser("item-get-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.get(`/shelf/item/${fakeId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(404);
	});

	it("returns 200 with item shape for a valid id", async () => {
		await loginAsNewUser("item-get-200@test.com");

		// Create an item to retrieve
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/item")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Test Item" });
		expect(createRes.status).toBe(201);
		const itemId = createRes.body.item._id;

		const csrf = await getCsrf();
		const res = await agent
			.get(`/shelf/item/${itemId}`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.item).toBeDefined();
		expect(res.body.item.name).toBe("Test Item");
	});
});

// ---------------------------------------------------------------------------
// POST /shelf/item
// ---------------------------------------------------------------------------

describe("POST /shelf/item", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ name: "Milk" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("item-create@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 201 with item in body on valid create", async () => {
		await loginAsNewUser("item-create-201@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ name: "Butter" });

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Item created!");
		expect(res.body.item).toBeDefined();
		expect(res.body.item.name).toBe("Butter");
		expect(res.body.item._id).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// PATCH /shelf/item
// ---------------------------------------------------------------------------

describe("PATCH /shelf/item", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ itemId: new mongoose.Types.ObjectId().toHexString() });
		expect(res.status).toBe(401);
	});

	it("returns 400 when itemId is missing", async () => {
		await loginAsNewUser("item-patch-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ name: "No ID Provided" });
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent itemId", async () => {
		await loginAsNewUser("item-patch-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ itemId: fakeId, name: "Ghost Item" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with updated item on valid update", async () => {
		await loginAsNewUser("item-patch-200@test.com");

		// Create an item to update
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/item")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Old Name" });
		expect(createRes.status).toBe(201);
		const itemId = createRes.body.item._id;

		const csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ itemId, name: "New Name" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Item updated successfully");
		expect(res.body.item.name).toBe("New Name");
	});
});

// ---------------------------------------------------------------------------
// DELETE /shelf/item
// ---------------------------------------------------------------------------

describe("DELETE /shelf/item", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ itemId: new mongoose.Types.ObjectId().toHexString() });
		expect(res.status).toBe(401);
	});

	it("returns 400 when itemId is missing", async () => {
		await loginAsNewUser("item-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent itemId", async () => {
		await loginAsNewUser("item-delete-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ itemId: fakeId });
		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		await loginAsNewUser("item-delete-200@test.com");

		// Create an item to delete
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/item")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Doomed Item" });
		expect(createRes.status).toBe(201);
		const itemId = createRes.body.item._id;

		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/item")
			.set("x-csrf-token", csrf)
			.send({ itemId });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Item deleted successfully");
	});
});

// ---------------------------------------------------------------------------
// POST /shelf/item/add-store
// ---------------------------------------------------------------------------

describe("POST /shelf/item/add-store", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item/add-store")
			.set("x-csrf-token", csrf)
			.send({
				itemId: new mongoose.Types.ObjectId().toHexString(),
				storeId: new mongoose.Types.ObjectId().toHexString(),
				storeItemId: "SKU-001",
			});
		expect(res.status).toBe(401);
	});

	it("returns 400 when fields are missing", async () => {
		await loginAsNewUser("item-addstore-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item/add-store")
			.set("x-csrf-token", csrf)
			.send({ itemId: new mongoose.Types.ObjectId().toHexString() }); // missing storeId and storeItemId
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent storeId", async () => {
		await loginAsNewUser("item-addstore-404store@test.com");

		// Create a real item first
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/item")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Cereal" });
		expect(createRes.status).toBe(201);
		const itemId = createRes.body.item._id;

		const fakeStoreId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item/add-store")
			.set("x-csrf-token", csrf)
			.send({ itemId, storeId: fakeStoreId, storeItemId: "SKU-001" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with connectedStores entry on valid add", async () => {
		await loginAsNewUser("item-addstore-200@test.com");

		// 1. Create an item
		const createItemCsrf = await getCsrf();
		const createItemRes = await agent
			.post("/shelf/item")
			.set("x-csrf-token", createItemCsrf)
			.send({ name: "Orange Juice" });
		expect(createItemRes.status).toBe(201);
		const itemId = createItemRes.body.item._id;

		// 2. Create a store
		const createStoreCsrf = await getCsrf();
		const createStoreRes = await agent
			.post("/store/store")
			.set("x-csrf-token", createStoreCsrf)
			.send({ name: "Test Store" });
		expect(createStoreRes.status).toBe(201);
		const storeId = createStoreRes.body.store._id;

		// 3. Add the store to the item
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item/add-store")
			.set("x-csrf-token", csrf)
			.send({ itemId, storeId, storeItemId: "SKU-001" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Store added to item");
		expect(res.body.item).toBeDefined();
		expect(Array.isArray(res.body.item.connectedStores)).toBe(true);
		expect(res.body.item.connectedStores).toHaveLength(1);
		expect(res.body.item.connectedStores[0].storeName).toBe("Test Store");
	});
});
