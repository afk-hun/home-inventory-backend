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

/** Creates a user + household in DB, logs in via HTTP, returns the user and household. */
async function loginAsNewUser(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const user = await prisma.user.create({ data: { name: "Schedule Test User", email, password: hashed } });
	const household = await prisma.household.create({ data: { name: "Schedule Test Household", ownerId: user.id } });
	await prisma.householdMember.create({ data: { householdId: household.id, userId: user.id } });
	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });
	return { user, household };
}

/** Creates a recipe in DB scoped to the given household. */
async function createRecipeInDb(householdId: string) {
	return prisma.recipe.create({ data: { name: "Test Recipe", householdId } });
}

const validMeal = (recipeId: string) => ({
	start: "2026-03-01T07:00:00.000Z",
	end: "2026-03-01T08:00:00.000Z",
	mealType: "Breakfast",
	recipe: recipeId,
	portion: 2,
});

// ---------------------------------------------------------------------------
// GET /cooking-schedule
// ---------------------------------------------------------------------------

describe("GET /cooking-schedule", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent.get("/cooking-schedule").set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with empty schedules array when authenticated and no schedules exist", async () => {
		await loginAsNewUser("cs-get-empty@test.com");
		const csrf = await getCsrf();
		const res = await agent.get("/cooking-schedule").set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.schedules).toBeDefined();
		expect(Array.isArray(res.body.schedules)).toBe(true);
		expect(res.body.schedules).toHaveLength(0);
	});

	it("returns only schedules belonging to the authenticated user's household", async () => {
		const { household } = await loginAsNewUser("cs-get-scoped@test.com");
		const recipe = await createRecipeInDb(household.id);

		const csrf1 = await getCsrf();
		await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf1)
			.send({
				name: "March 2026",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
				meals: [validMeal(recipe.id)],
			});

		const csrf2 = await getCsrf();
		await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf2)
			.send({
				name: "April 2026",
				start: "2026-04-01T00:00:00.000Z",
				end: "2026-04-30T23:59:59.000Z",
			});

		const csrf3 = await getCsrf();
		const res = await agent.get("/cooking-schedule").set("x-csrf-token", csrf3);

		expect(res.status).toBe(200);
		expect(res.body.schedules).toHaveLength(2);
		const names = res.body.schedules.map((s: any) => s.name);
		expect(names).toContain("March 2026");
		expect(names).toContain("April 2026");
	});
});

// ---------------------------------------------------------------------------
// GET /cooking-schedule/:id
// ---------------------------------------------------------------------------

describe("GET /cooking-schedule/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const fakeId = "nonexistent-id";
		const res = await agent
			.get(`/cooking-schedule/${fakeId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 404 for a non-existent schedule id", async () => {
		await loginAsNewUser("cs-getid-404@test.com");
		const fakeId = "nonexistent-id";
		const csrf = await getCsrf();
		const res = await agent
			.get(`/cooking-schedule/${fakeId}`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(404);
	});

	it("returns 200 with the schedule after it has been created", async () => {
		await loginAsNewUser("cs-getid-200@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Fetched Schedule",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
			});
		expect(createRes.status).toBe(201);
		const scheduleId = createRes.body.schedule._id;

		const csrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const res = await agent
			.get(`/cooking-schedule/${scheduleId}`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.schedule).toBeDefined();
		expect(res.body.schedule._id).toBe(scheduleId);
		expect(res.body.schedule.name).toBe("Fetched Schedule");
	});
});

// ---------------------------------------------------------------------------
// POST /cooking-schedule
// ---------------------------------------------------------------------------

describe("POST /cooking-schedule", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ name: "Ghost", start: "2026-03-01", end: "2026-03-31" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("cs-create-400-name@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ start: "2026-03-01", end: "2026-03-31" });

		expect(res.status).toBe(400);
	});

	it("returns 400 when start is missing", async () => {
		await loginAsNewUser("cs-create-400-start@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ name: "March 2026", end: "2026-03-31" });

		expect(res.status).toBe(400);
	});

	it("returns 400 when end is missing", async () => {
		await loginAsNewUser("cs-create-400-end@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ name: "March 2026", start: "2026-03-01" });

		expect(res.status).toBe(400);
	});

	it("returns 201 with correct body on valid create (no meals)", async () => {
		await loginAsNewUser("cs-create-201-empty@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({
				name: "March 2026",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
			});

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Schedule created!");
		expect(res.body.schedule).toBeDefined();
		expect(res.body.schedule._id).toBeDefined();
		expect(res.body.schedule.name).toBe("March 2026");
		expect(res.body.schedule.householdId).toBeDefined();
		expect(Array.isArray(res.body.schedule.meals)).toBe(true);
		expect(res.body.schedule.meals).toHaveLength(0);
	});

	it("returns 201 with meals when provided", async () => {
		const { household } = await loginAsNewUser("cs-create-201-meals@test.com");
		const recipe = await createRecipeInDb(household.id);

		const csrf = await getCsrf();
		const res = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({
				name: "March 2026",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
				meals: [validMeal(recipe.id)],
			});

		expect(res.status).toBe(201);
		expect(res.body.schedule.meals).toHaveLength(1);
		expect(res.body.schedule.meals[0].mealType).toBe("Breakfast");
		expect(res.body.schedule.meals[0].portion).toBe(2);
	});

	it("persists the newly created schedule so GET returns it", async () => {
		await loginAsNewUser("cs-create-persist@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Persisted Schedule",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
			});
		expect(createRes.status).toBe(201);

		const csrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent.get("/cooking-schedule").set("x-csrf-token", csrf);

		expect(getRes.status).toBe(200);
		const names = getRes.body.schedules.map((s: any) => s.name);
		expect(names).toContain("Persisted Schedule");
	});
});

// ---------------------------------------------------------------------------
// PATCH /cooking-schedule
// ---------------------------------------------------------------------------

describe("PATCH /cooking-schedule", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ scheduleId: "nonexistent-id", name: "Ghost" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when scheduleId is missing", async () => {
		await loginAsNewUser("cs-patch-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ name: "New Name" });

		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent scheduleId", async () => {
		await loginAsNewUser("cs-patch-404@test.com");
		const fakeId = "nonexistent-id";
		const csrf = await getCsrf();
		const res = await agent
			.patch("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ scheduleId: fakeId, name: "Ghost Schedule" });

		expect(res.status).toBe(404);
	});

	it("returns 200 with updated schedule on valid update", async () => {
		await loginAsNewUser("cs-patch-200@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Old Name",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
			});
		expect(createRes.status).toBe(201);
		const scheduleId = createRes.body.schedule._id;

		const patchCsrf = await getCsrf();
		const res = await agent
			.patch("/cooking-schedule")
			.set("x-csrf-token", patchCsrf)
			.send({ scheduleId, name: "New Name" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Schedule updated successfully");
		expect(res.body.schedule).toBeDefined();
		expect(res.body.schedule.name).toBe("New Name");
	});

	it("update is reflected in subsequent GET by id", async () => {
		await loginAsNewUser("cs-patch-reflect@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Before Update",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
			});
		expect(createRes.status).toBe(201);
		const scheduleId = createRes.body.schedule._id;

		const patchCsrf = await getCsrf();
		await agent
			.patch("/cooking-schedule")
			.set("x-csrf-token", patchCsrf)
			.send({ scheduleId, name: "After Update" });

		const csrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get(`/cooking-schedule/${scheduleId}`)
			.set("x-csrf-token", csrf);

		expect(getRes.status).toBe(200);
		expect(getRes.body.schedule.name).toBe("After Update");
	});
});

// ---------------------------------------------------------------------------
// DELETE /cooking-schedule
// ---------------------------------------------------------------------------

describe("DELETE /cooking-schedule", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ scheduleId: "nonexistent-id" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when scheduleId is missing", async () => {
		await loginAsNewUser("cs-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({});

		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent scheduleId", async () => {
		await loginAsNewUser("cs-delete-404@test.com");
		const fakeId = "nonexistent-id";
		const csrf = await getCsrf();
		const res = await agent
			.delete("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ scheduleId: fakeId });

		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		await loginAsNewUser("cs-delete-200@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Doomed Schedule",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
			});
		expect(createRes.status).toBe(201);
		const scheduleId = createRes.body.schedule._id;

		const csrf = await getCsrf();
		const res = await agent
			.delete("/cooking-schedule")
			.set("x-csrf-token", csrf)
			.send({ scheduleId });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Schedule deleted successfully");
	});

	it("deleted schedule no longer appears in GET list", async () => {
		await loginAsNewUser("cs-delete-gone@test.com");

		const csrf1 = await getCsrf();
		const createRes = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf1)
			.send({
				name: "To Delete",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
			});
		expect(createRes.status).toBe(201);
		const scheduleId = createRes.body.schedule._id;

		const csrf2 = await getCsrf();
		await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", csrf2)
			.send({
				name: "To Keep",
				start: "2026-04-01T00:00:00.000Z",
				end: "2026-04-30T23:59:59.000Z",
			});

		const deleteCsrf = await getCsrf();
		await agent
			.delete("/cooking-schedule")
			.set("x-csrf-token", deleteCsrf)
			.send({ scheduleId });

		const listCsrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent.get("/cooking-schedule").set("x-csrf-token", listCsrf);

		expect(getRes.status).toBe(200);
		expect(getRes.body.schedules).toHaveLength(1);
		expect(getRes.body.schedules[0].name).toBe("To Keep");
	});

	it("deleted schedule returns 404 when fetched by id", async () => {
		await loginAsNewUser("cs-delete-byid@test.com");

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/cooking-schedule")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Gone Schedule",
				start: "2026-03-01T00:00:00.000Z",
				end: "2026-03-31T23:59:59.000Z",
			});
		expect(createRes.status).toBe(201);
		const scheduleId = createRes.body.schedule._id;

		const deleteCsrf = await getCsrf();
		await agent
			.delete("/cooking-schedule")
			.set("x-csrf-token", deleteCsrf)
			.send({ scheduleId });

		const csrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get(`/cooking-schedule/${scheduleId}`)
			.set("x-csrf-token", csrf);

		expect(getRes.status).toBe(404);
	});
});
