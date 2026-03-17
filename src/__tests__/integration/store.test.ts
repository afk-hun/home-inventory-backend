import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../app";
import User from "../../models/user";
import Household from "../../models/household";
import mongoose from "mongoose";

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
		name: "Store User",
		email,
		password: hashed,
	}).save();

	await new Household({
		name: "Store Household",
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
// GET /store/store
// ---------------------------------------------------------------------------

describe("GET /store/store", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent.get("/store/store").set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with stores array and pagination when authenticated", async () => {
		await loginAsNewUser("store-list-200@test.com");
		const csrf = await getCsrf();
		const res = await agent.get("/store/store").set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.stores)).toBe(true);
		expect(res.body.pagination).toBeDefined();
		expect(typeof res.body.pagination.total).toBe("number");
		expect(typeof res.body.pagination.page).toBe("number");
		expect(typeof res.body.pagination.limit).toBe("number");
		expect(typeof res.body.pagination.totalPages).toBe("number");
	});
});

// ---------------------------------------------------------------------------
// GET /store/store/:id
// ---------------------------------------------------------------------------

describe("GET /store/store/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.get(`/store/store/${fakeId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 404 for a non-existent store id", async () => {
		await loginAsNewUser("store-get-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.get(`/store/store/${fakeId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(404);
	});

	it("returns 200 with store shape for a valid id", async () => {
		await loginAsNewUser("store-get-200@test.com");

		// First create a store via the API to get a valid householdId-scoped store
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/store/store")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Test Grocery" });

		expect(createRes.status).toBe(201);
		const storeId = createRes.body.store._id;

		const csrf = await getCsrf();
		const res = await agent
			.get(`/store/store/${storeId}`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.store).toBeDefined();
		expect(res.body.store.name).toBe("Test Grocery");
	});
});

// ---------------------------------------------------------------------------
// POST /store/store
// ---------------------------------------------------------------------------

describe("POST /store/store", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/store/store")
			.set("x-csrf-token", csrf)
			.send({ name: "Costco" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("store-create-400-name@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/store/store")
			.set("x-csrf-token", csrf)
			.send({}); // missing name
		expect(res.status).toBe(400);
	});

	it("returns 201 with store in body on valid create", async () => {
		await loginAsNewUser("store-create-201@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/store/store")
			.set("x-csrf-token", csrf)
			.send({ name: "Walmart" });

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Store created!");
		expect(res.body.store).toBeDefined();
		expect(res.body.store.name).toBe("Walmart");
		expect(res.body.store._id).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// PATCH /store/store
// ---------------------------------------------------------------------------

describe("PATCH /store/store", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/store/store")
			.set("x-csrf-token", csrf)
			.send({ storeId: new mongoose.Types.ObjectId().toHexString() });
		expect(res.status).toBe(401);
	});

	it("returns 400 when storeId is missing", async () => {
		await loginAsNewUser("store-patch-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/store/store")
			.set("x-csrf-token", csrf)
			.send({ name: "No ID" });
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent storeId", async () => {
		await loginAsNewUser("store-patch-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.patch("/store/store")
			.set("x-csrf-token", csrf)
			.send({ storeId: fakeId, name: "Ghost Store" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with updated store on valid update", async () => {
		await loginAsNewUser("store-patch-200@test.com");

		// Create a store to update
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/store/store")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Old Name" });
		expect(createRes.status).toBe(201);
		const storeId = createRes.body.store._id;

		const csrf = await getCsrf();
		const res = await agent
			.patch("/store/store")
			.set("x-csrf-token", csrf)
			.send({ storeId, name: "New Name" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Store updated successfully");
		expect(res.body.store.name).toBe("New Name");
	});
});

// ---------------------------------------------------------------------------
// DELETE /store/store
// ---------------------------------------------------------------------------

describe("DELETE /store/store", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/store/store")
			.set("x-csrf-token", csrf)
			.send({ storeId: new mongoose.Types.ObjectId().toHexString() });
		expect(res.status).toBe(401);
	});

	it("returns 400 when storeId is missing", async () => {
		await loginAsNewUser("store-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/store/store")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent storeId", async () => {
		await loginAsNewUser("store-delete-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.delete("/store/store")
			.set("x-csrf-token", csrf)
			.send({ storeId: fakeId });
		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		await loginAsNewUser("store-delete-200@test.com");

		// Create a store to delete
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/store/store")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Doomed Store" });
		expect(createRes.status).toBe(201);
		const storeId = createRes.body.store._id;

		const csrf = await getCsrf();
		const res = await agent
			.delete("/store/store")
			.set("x-csrf-token", csrf)
			.send({ storeId });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Store deleted successfully");
	});
});

