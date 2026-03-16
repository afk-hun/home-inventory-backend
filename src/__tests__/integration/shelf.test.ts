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

/**
 * Creates a user + household in the DB, logs in via HTTP.
 * Returns the household document so callers can get householdId.
 */
async function loginAsNewUser(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const user = await new User({
		name: "Shelf Test User",
		email,
		password: hashed,
	}).save();
	const household = await new Household({
		name: "Shelf Test Household",
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

// ---------------------------------------------------------------------------
// GET /shelf/shelf
// ---------------------------------------------------------------------------

describe("GET /shelf/shelf", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent.get("/shelf/shelf").set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with shelves and pagination when authenticated", async () => {
		await loginAsNewUser("shelf-get@test.com");
		const csrf = await getCsrf();
		const res = await agent.get("/shelf/shelf").set("x-csrf-token", csrf);
		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.shelves)).toBe(true);
		expect(res.body.pagination).toBeDefined();
		expect(typeof res.body.pagination.total).toBe("number");
		expect(typeof res.body.pagination.page).toBe("number");
		expect(typeof res.body.pagination.limit).toBe("number");
		expect(typeof res.body.pagination.totalPages).toBe("number");
	});
});

// ---------------------------------------------------------------------------
// GET /shelf/shelf/:id
// ---------------------------------------------------------------------------

describe("GET /shelf/shelf/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const res = await agent
			.get(`/shelf/shelf/${fakeId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 404 for a non-existent shelf id", async () => {
		await loginAsNewUser("shelf-get-404@test.com");
		const csrf = await getCsrf();
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const res = await agent
			.get(`/shelf/shelf/${fakeId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(404);
	});

	// BUG: getShelf calls .populate("items.item") which requires an "Item"
	// mongoose model. No Item model is registered in the application, causing
	// Mongoose to throw "Schema hasn't been registered for model 'Item'" and
	// the endpoint returns 500 instead of 200.
	// This test is marked it.fails to track the bug — remove it.fails once the
	// Item model is registered or the populate is fixed.
	it("returns 200 with shelf shape for a valid id (BUG: Item model not registered)", async () => {
		await loginAsNewUser("shelf-get-200@test.com");

		// Create a shelf first
		let csrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ name: "Pantry", place: "Kitchen", type: "Dry goods" });
		expect(createRes.status).toBe(201);
		const shelfId = createRes.body.shelf._id;

		csrf = await getCsrf();
		const res = await agent
			.get(`/shelf/shelf/${shelfId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(200);
		expect(res.body.shelf).toBeDefined();
		expect(res.body.shelf._id).toBe(shelfId);
		expect(res.body.shelf.name).toBe("Pantry");
	});
});

// ---------------------------------------------------------------------------
// POST /shelf/shelf
// ---------------------------------------------------------------------------

describe("POST /shelf/shelf", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ name: "Fridge", place: "Kitchen", type: "Cold storage" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("shelf-create-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ place: "Kitchen", type: "Cold storage" });
		expect(res.status).toBe(400);
	});

	it("returns 201 with shelf in body on valid create", async () => {
		await loginAsNewUser("shelf-create-201@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ name: "Fridge", place: "Kitchen", type: "Cold storage" });
		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Shelf created!");
		expect(res.body.shelf).toBeDefined();
		expect(res.body.shelf.name).toBe("Fridge");
		expect(res.body.shelf.place).toBe("Kitchen");
		expect(res.body.shelf.type).toBe("Cold storage");
		expect(res.body.shelf._id).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// PATCH /shelf/shelf
// ---------------------------------------------------------------------------

describe("PATCH /shelf/shelf", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ shelfId: new mongoose.Types.ObjectId().toHexString(), name: "X" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when shelfId is missing", async () => {
		await loginAsNewUser("shelf-patch-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ name: "No ID" });
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent shelfId", async () => {
		await loginAsNewUser("shelf-patch-404@test.com");
		const csrf = await getCsrf();
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const res = await agent
			.patch("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ shelfId: fakeId, name: "Ghost" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with updated shelf", async () => {
		await loginAsNewUser("shelf-patch-200@test.com");

		let csrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ name: "Old Name" });
		expect(createRes.status).toBe(201);
		const shelfId = createRes.body.shelf._id;

		csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ shelfId, name: "New Name", place: "Basement", type: "Bulk" });
		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Shelf updated successfully");
		expect(res.body.shelf.name).toBe("New Name");
		expect(res.body.shelf.place).toBe("Basement");
		expect(res.body.shelf.type).toBe("Bulk");
	});
});

// ---------------------------------------------------------------------------
// DELETE /shelf/shelf
// ---------------------------------------------------------------------------

describe("DELETE /shelf/shelf", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ shelfId: new mongoose.Types.ObjectId().toHexString() });
		expect(res.status).toBe(401);
	});

	it("returns 400 when shelfId is missing", async () => {
		await loginAsNewUser("shelf-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent shelfId", async () => {
		await loginAsNewUser("shelf-delete-404@test.com");
		const csrf = await getCsrf();
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const res = await agent
			.delete("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ shelfId: fakeId });
		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		await loginAsNewUser("shelf-delete-200@test.com");

		let csrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ name: "To Delete" });
		expect(createRes.status).toBe(201);
		const shelfId = createRes.body.shelf._id;

		csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ shelfId });
		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Shelf deleted successfully");
	});
});

// ---------------------------------------------------------------------------
// POST /shelf/shelf/add-item
// ---------------------------------------------------------------------------

describe("POST /shelf/shelf/add-item", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/shelf/add-item")
			.set("x-csrf-token", csrf)
			.send({
				shelfId: new mongoose.Types.ObjectId().toHexString(),
				itemId: new mongoose.Types.ObjectId().toHexString(),
				quantity: 1,
			});
		expect(res.status).toBe(401);
	});

	it("returns 400 when required fields are missing", async () => {
		await loginAsNewUser("shelf-additem-400@test.com");
		const csrf = await getCsrf();
		// Missing shelfId and itemId/itemName and quantity
		const res = await agent
			.post("/shelf/shelf/add-item")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 400 when quantity is missing", async () => {
		await loginAsNewUser("shelf-additem-400b@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/shelf/add-item")
			.set("x-csrf-token", csrf)
			.send({
				shelfId: new mongoose.Types.ObjectId().toHexString(),
				itemId: new mongoose.Types.ObjectId().toHexString(),
			});
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent shelf", async () => {
		await loginAsNewUser("shelf-additem-404@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/shelf/add-item")
			.set("x-csrf-token", csrf)
			.send({
				shelfId: new mongoose.Types.ObjectId().toHexString(),
				itemId: new mongoose.Types.ObjectId().toHexString(),
				quantity: 1,
			});
		expect(res.status).toBe(404);
	});

	it("returns 200 with shelf.items populated after adding an item", async () => {
		await loginAsNewUser("shelf-additem-200@test.com");

		// Create a shelf
		let csrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ name: "Storage Shelf" });
		expect(createRes.status).toBe(201);
		const shelfId = createRes.body.shelf._id;

		// Use a raw ObjectId as itemId (no Item collection needed — the schema stores the ref without validation)
		const itemId = new mongoose.Types.ObjectId().toHexString();

		csrf = await getCsrf();
		const res = await agent
			.post("/shelf/shelf/add-item")
			.set("x-csrf-token", csrf)
			.send({ shelfId, itemId, quantity: 2 });
		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Item added to shelf");
		expect(res.body.shelf).toBeDefined();
		expect(Array.isArray(res.body.shelf.items)).toBe(true);
		expect(res.body.shelf.items).toHaveLength(1);
		expect(res.body.shelf.items[0].quantity).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// DELETE /shelf/shelf/remove-item
// ---------------------------------------------------------------------------

describe("DELETE /shelf/shelf/remove-item", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/shelf/remove-item")
			.set("x-csrf-token", csrf)
			.send({
				shelfId: new mongoose.Types.ObjectId().toHexString(),
				shelfItemId: new mongoose.Types.ObjectId().toHexString(),
			});
		expect(res.status).toBe(401);
	});

	it("returns 400 when required fields are missing", async () => {
		await loginAsNewUser("shelf-removeitem-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/shelf/remove-item")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent shelf", async () => {
		await loginAsNewUser("shelf-removeitem-404@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/shelf/remove-item")
			.set("x-csrf-token", csrf)
			.send({
				shelfId: new mongoose.Types.ObjectId().toHexString(),
				shelfItemId: new mongoose.Types.ObjectId().toHexString(),
			});
		expect(res.status).toBe(404);
	});

	it("returns 200 after removing an item from shelf", async () => {
		await loginAsNewUser("shelf-removeitem-200@test.com");

		// Create a shelf
		let csrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/shelf")
			.set("x-csrf-token", csrf)
			.send({ name: "Removal Shelf" });
		expect(createRes.status).toBe(201);
		const shelfId = createRes.body.shelf._id;

		// Add an item
		const itemId = new mongoose.Types.ObjectId().toHexString();
		csrf = await getCsrf();
		const addRes = await agent
			.post("/shelf/shelf/add-item")
			.set("x-csrf-token", csrf)
			.send({ shelfId, itemId, quantity: 5 });
		expect(addRes.status).toBe(200);
		expect(addRes.body.shelf.items).toHaveLength(1);
		const shelfItemId = addRes.body.shelf.items[0]._id;

		// Remove the item
		csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/shelf/remove-item")
			.set("x-csrf-token", csrf)
			.send({ shelfId, shelfItemId });
		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Item removed from shelf");
		expect(res.body.shelf.items).toHaveLength(0);
	});
});
