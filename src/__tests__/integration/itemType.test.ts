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
	const user = await prisma.user.create({ data: { name: "ItemType User", email, password: hashed } });
	const _hh = await prisma.household.create({ data: { name: "ItemType Household", ownerId: user.id } });
	await prisma.householdMember.create({ data: { householdId: _hh.id, userId: user.id } });
	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });
}

// ---------------------------------------------------------------------------
// GET /shelf/item-type
// ---------------------------------------------------------------------------

describe("GET /shelf/item-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get("/shelf/item-type")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with itemTypes array when authenticated", async () => {
		await loginAsNewUser("it-get-200@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.get("/shelf/item-type")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.itemTypes)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// POST /shelf/item-type
// ---------------------------------------------------------------------------

describe("POST /shelf/item-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ name: "Electronics" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("it-post-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 201 with itemType on valid create", async () => {
		await loginAsNewUser("it-post-201@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ name: "Books" });
		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Item type created!");
		expect(res.body.itemType).toBeDefined();
		expect(res.body.itemType.name).toBe("Books");
		expect(res.body.itemType._id).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// PATCH /shelf/item-type
// ---------------------------------------------------------------------------

describe("PATCH /shelf/item-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({
				itemTypeId: "nonexistent-id",
				name: "New Name",
			});
		expect(res.status).toBe(401);
	});

	it("returns 400 when itemTypeId is missing", async () => {
		await loginAsNewUser("it-patch-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ name: "No ID Provided" });
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent itemTypeId", async () => {
		await loginAsNewUser("it-patch-404@test.com");
		const csrf = await getCsrf();
		const fakeId = "nonexistent-id";
		const res = await agent
			.patch("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ itemTypeId: fakeId, name: "Ghost" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with renamed itemType (create then rename)", async () => {
		await loginAsNewUser("it-patch-200@test.com");

		let csrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ name: "Old Name" });
		expect(createRes.status).toBe(201);
		const itemTypeId = createRes.body.itemType._id;

		csrf = await getCsrf();
		const res = await agent
			.patch("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ itemTypeId, name: "New Name" });
		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Item type renamed successfully");
		expect(res.body.itemTypeId).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// DELETE /shelf/item-type
// ---------------------------------------------------------------------------

describe("DELETE /shelf/item-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ itemTypeId: "nonexistent-id" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when itemTypeId is missing", async () => {
		await loginAsNewUser("it-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent itemTypeId", async () => {
		await loginAsNewUser("it-delete-404@test.com");
		const fakeId = "nonexistent-id";
		const csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ itemTypeId: fakeId });
		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion (create then delete)", async () => {
		await loginAsNewUser("it-delete-200@test.com");

		let csrf = await getCsrf();
		const createRes = await agent
			.post("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ name: "Doomed Item Type" });
		expect(createRes.status).toBe(201);
		const itemTypeId = createRes.body.itemType._id;

		csrf = await getCsrf();
		const res = await agent
			.delete("/shelf/item-type")
			.set("x-csrf-token", csrf)
			.send({ itemTypeId });
		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Item type deleted successfully");
	});
});
