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

/** Creates a user + household in DB, logs in via HTTP, returns the user. */
async function loginAsNewUser(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const user = await new User({
		name: "Meal Type User",
		email,
		password: hashed,
	}).save();

	await new Household({
		name: "Meal Type Household",
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
// GET /meal/meal-type
// ---------------------------------------------------------------------------

describe("GET /meal/meal-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get("/meal/meal-type")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with an empty mealTypes array when authenticated and no types exist", async () => {
		await loginAsNewUser("mt-get-empty@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.get("/meal/meal-type")
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.mealTypes).toBeDefined();
		expect(Array.isArray(res.body.mealTypes)).toBe(true);
		expect(res.body.mealTypes).toHaveLength(0);
	});

	it("returns only meal types belonging to the authenticated user's household", async () => {
		await loginAsNewUser("mt-get-scoped@test.com");

		const csrf1 = await getCsrf();
		await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", csrf1)
			.send({ name: "Breakfast" });

		const csrf2 = await getCsrf();
		await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", csrf2)
			.send({ name: "Dinner" });

		const csrf3 = await getCsrf();
		const res = await agent
			.get("/meal/meal-type")
			.set("x-csrf-token", csrf3);

		expect(res.status).toBe(200);
		expect(res.body.mealTypes).toHaveLength(2);
		const names = res.body.mealTypes.map((mt: any) => mt.name);
		expect(names).toContain("Breakfast");
		expect(names).toContain("Dinner");
	});
});

// ---------------------------------------------------------------------------
// POST /meal/meal-type
// ---------------------------------------------------------------------------

describe("POST /meal/meal-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ name: "Lunch" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("mt-create-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({});

		expect(res.status).toBe(400);
	});

	it("returns 201 with correct body on valid create", async () => {
		await loginAsNewUser("mt-create-201@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ name: "Breakfast" });

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Meal type created!");
		expect(res.body.mealType).toBeDefined();
		expect(res.body.mealType.name).toBe("Breakfast");
		expect(res.body.mealType._id).toBeDefined();
		expect(res.body.mealType.householdId).toBeDefined();
	});

	it("persists the newly created meal type so GET returns it", async () => {
		await loginAsNewUser("mt-create-persist@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Snack" });
		expect(createRes.status).toBe(201);

		const listCsrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get("/meal/meal-type")
			.set("x-csrf-token", listCsrf);

		expect(getRes.status).toBe(200);
		const names = getRes.body.mealTypes.map((mt: any) => mt.name);
		expect(names).toContain("Snack");
	});
});

// ---------------------------------------------------------------------------
// PATCH /meal/meal-type
// ---------------------------------------------------------------------------

describe("PATCH /meal/meal-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ mealTypeId: new mongoose.Types.ObjectId().toHexString(), name: "Ghost" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when mealTypeId is missing", async () => {
		await loginAsNewUser("mt-patch-400-id@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ name: "New Name" });

		expect(res.status).toBe(400);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("mt-patch-400-name@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ mealTypeId: new mongoose.Types.ObjectId().toHexString() });

		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent mealTypeId", async () => {
		await loginAsNewUser("mt-patch-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.patch("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ mealTypeId: fakeId, name: "Ghost Type" });

		expect(res.status).toBe(404);
	});

	it("returns 200 with updated mealTypeId on valid rename", async () => {
		await loginAsNewUser("mt-patch-200@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Old Name" });
		expect(createRes.status).toBe(201);
		const mealTypeId = createRes.body.mealType._id;

		const csrf = await getCsrf();
		const res = await agent
			.patch("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ mealTypeId, name: "New Name" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Meal type renamed successfully");
		expect(res.body.mealTypeId).toBeDefined();
	});

	it("rename is reflected in subsequent GET", async () => {
		await loginAsNewUser("mt-patch-reflect@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Before Rename" });
		expect(createRes.status).toBe(201);
		const mealTypeId = createRes.body.mealType._id;

		const patchCsrf = await getCsrf();
		await agent
			.patch("/meal/meal-type")
			.set("x-csrf-token", patchCsrf)
			.send({ mealTypeId, name: "After Rename" });

		const getCsrfToken = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get("/meal/meal-type")
			.set("x-csrf-token", getCsrfToken);

		expect(getRes.status).toBe(200);
		const names = getRes.body.mealTypes.map((mt: any) => mt.name);
		expect(names).toContain("After Rename");
		expect(names).not.toContain("Before Rename");
	});
});

// ---------------------------------------------------------------------------
// DELETE /meal/meal-type
// ---------------------------------------------------------------------------

describe("DELETE /meal/meal-type", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ mealTypeId: new mongoose.Types.ObjectId().toHexString() });
		expect(res.status).toBe(401);
	});

	it("returns 400 when mealTypeId is missing", async () => {
		await loginAsNewUser("mt-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({});

		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent mealTypeId", async () => {
		await loginAsNewUser("mt-delete-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.delete("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ mealTypeId: fakeId });

		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		await loginAsNewUser("mt-delete-200@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Doomed Type" });
		expect(createRes.status).toBe(201);
		const mealTypeId = createRes.body.mealType._id;

		const csrf = await getCsrf();
		const res = await agent
			.delete("/meal/meal-type")
			.set("x-csrf-token", csrf)
			.send({ mealTypeId });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Meal type deleted successfully");
	});

	it("deleted meal type no longer appears in GET", async () => {
		await loginAsNewUser("mt-delete-gone@test.com");

		const csrf1 = await getCsrf();
		const createRes = await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", csrf1)
			.send({ name: "To Delete" });
		expect(createRes.status).toBe(201);
		const mealTypeId = createRes.body.mealType._id;

		const csrf2 = await getCsrf();
		await agent
			.post("/meal/meal-type")
			.set("x-csrf-token", csrf2)
			.send({ name: "To Keep" });

		const csrf3 = await getCsrf();
		await agent
			.delete("/meal/meal-type")
			.set("x-csrf-token", csrf3)
			.send({ mealTypeId });

		const csrf4 = await getCsrf();
		const getRes = await agent
			.get("/meal/meal-type")
			.set("x-csrf-token", csrf4);

		expect(getRes.status).toBe(200);
		expect(getRes.body.mealTypes).toHaveLength(1);
		expect(getRes.body.mealTypes[0].name).toBe("To Keep");
	});
});
