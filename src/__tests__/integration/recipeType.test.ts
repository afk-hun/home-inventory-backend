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

/** Creates a user + household in DB, logs in via HTTP, returns the user. */
async function loginAsNewUser(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const user = await prisma.user.create({ data: { name: "Recipe Type User", email, password: hashed } });
	const _hh = await prisma.household.create({ data: { name: "Recipe Type Household", ownerId: user.id } });
	await prisma.householdMember.create({ data: { householdId: _hh.id, userId: user.id } });
	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });
	return user;
}

// ---------------------------------------------------------------------------
// GET /recipe/recipe-type
// ---------------------------------------------------------------------------

describe("GET /recipe/recipe-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get("/recipe/recipe-type")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with an empty recipeTypes array when authenticated and no types exist", async () => {
		await loginAsNewUser("rt-get-empty@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.get("/recipe/recipe-type")
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.recipeTypes).toBeDefined();
		expect(Array.isArray(res.body.recipeTypes)).toBe(true);
		expect(res.body.recipeTypes).toHaveLength(0);
	});

	it("returns only recipe types belonging to the authenticated user's household", async () => {
		await loginAsNewUser("rt-get-scoped@test.com");

		// Create two recipe types
		const csrf1 = await getCsrf();
		await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", csrf1)
			.send({ name: "Soup" });

		const csrf2 = await getCsrf();
		await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", csrf2)
			.send({ name: "Salad" });

		const csrf3 = await getCsrf();
		const res = await agent
			.get("/recipe/recipe-type")
			.set("x-csrf-token", csrf3);

		expect(res.status).toBe(200);
		expect(res.body.recipeTypes).toHaveLength(2);
		const names = res.body.recipeTypes.map((rt: any) => rt.name);
		expect(names).toContain("Soup");
		expect(names).toContain("Salad");
	});
});

// ---------------------------------------------------------------------------
// POST /recipe/recipe-type
// ---------------------------------------------------------------------------

describe("POST /recipe/recipe-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ name: "Appetizer" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("rt-create-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({});

		expect(res.status).toBe(400);
	});

	it("returns 201 with correct body on valid create", async () => {
		await loginAsNewUser("rt-create-201@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ name: "Dessert" });

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Recipe type created!");
		expect(res.body.recipeType).toBeDefined();
		expect(res.body.recipeType.name).toBe("Dessert");
		expect(res.body.recipeType._id).toBeDefined();
		expect(res.body.recipeType.householdId).toBeDefined();
	});

	it("persists the newly created recipe type so GET returns it", async () => {
		await loginAsNewUser("rt-create-persist@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Breakfast" });
		expect(createRes.status).toBe(201);

		const listCsrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get("/recipe/recipe-type")
			.set("x-csrf-token", listCsrf);

		expect(getRes.status).toBe(200);
		const names = getRes.body.recipeTypes.map((rt: any) => rt.name);
		expect(names).toContain("Breakfast");
	});
});

// ---------------------------------------------------------------------------
// PATCH /recipe/recipe-type
// ---------------------------------------------------------------------------

describe("PATCH /recipe/recipe-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ recipeTypeId: "nonexistent-id", name: "Ghost" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when recipeTypeId is missing", async () => {
		await loginAsNewUser("rt-patch-400-id@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ name: "New Name" });

		expect(res.status).toBe(400);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("rt-patch-400-name@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ recipeTypeId: "nonexistent-id" });

		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent recipeTypeId", async () => {
		await loginAsNewUser("rt-patch-404@test.com");
		const fakeId = "nonexistent-id";
		const csrf = await getCsrf();
		const res = await agent
			.patch("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ recipeTypeId: fakeId, name: "Ghost Type" });

		expect(res.status).toBe(404);
	});

	it("returns 200 with updated recipeTypeId on valid rename", async () => {
		await loginAsNewUser("rt-patch-200@test.com");

		// Create a recipe type to rename
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Old Name" });
		expect(createRes.status).toBe(201);
		const recipeTypeId = createRes.body.recipeType._id;

		const csrf = await getCsrf();
		const res = await agent
			.patch("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ recipeTypeId, name: "New Name" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Recipe type renamed successfully");
		expect(res.body.recipeTypeId).toBeDefined();
	});

	it("rename is reflected in subsequent GET", async () => {
		await loginAsNewUser("rt-patch-reflect@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Before Rename" });
		expect(createRes.status).toBe(201);
		const recipeTypeId = createRes.body.recipeType._id;

		const patchCsrf = await getCsrf();
		await agent
			.patch("/recipe/recipe-type")
			.set("x-csrf-token", patchCsrf)
			.send({ recipeTypeId, name: "After Rename" });

		const getCsrfToken = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get("/recipe/recipe-type")
			.set("x-csrf-token", getCsrfToken);

		expect(getRes.status).toBe(200);
		const names = getRes.body.recipeTypes.map((rt: any) => rt.name);
		expect(names).toContain("After Rename");
		expect(names).not.toContain("Before Rename");
	});
});

// ---------------------------------------------------------------------------
// DELETE /recipe/recipe-type
// ---------------------------------------------------------------------------

describe("DELETE /recipe/recipe-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ recipeTypeId: "nonexistent-id" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when recipeTypeId is missing", async () => {
		await loginAsNewUser("rt-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({});

		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent recipeTypeId", async () => {
		await loginAsNewUser("rt-delete-404@test.com");
		const fakeId = "nonexistent-id";
		const csrf = await getCsrf();
		const res = await agent
			.delete("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ recipeTypeId: fakeId });

		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		await loginAsNewUser("rt-delete-200@test.com");

		// Create a recipe type to delete
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Doomed Type" });
		expect(createRes.status).toBe(201);
		const recipeTypeId = createRes.body.recipeType._id;

		const csrf = await getCsrf();
		const res = await agent
			.delete("/recipe/recipe-type")
			.set("x-csrf-token", csrf)
			.send({ recipeTypeId });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Recipe type deleted successfully");
	});

	it("deleted recipe type no longer appears in GET", async () => {
		await loginAsNewUser("rt-delete-gone@test.com");

		// Create two recipe types
		const csrf1 = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", csrf1)
			.send({ name: "To Delete" });
		expect(createRes.status).toBe(201);
		const recipeTypeId = createRes.body.recipeType._id;

		const csrf2 = await getCsrf();
		await agent
			.post("/recipe/recipe-type")
			.set("x-csrf-token", csrf2)
			.send({ name: "To Keep" });

		// Delete first one
		const csrf3 = await getCsrf();
		await agent
			.delete("/recipe/recipe-type")
			.set("x-csrf-token", csrf3)
			.send({ recipeTypeId });

		// Verify only the kept one remains
		const csrf4 = await getCsrf();
		const getRes = await agent
			.get("/recipe/recipe-type")
			.set("x-csrf-token", csrf4);

		expect(getRes.status).toBe(200);
		expect(getRes.body.recipeTypes).toHaveLength(1);
		expect(getRes.body.recipeTypes[0].name).toBe("To Keep");
	});
});
