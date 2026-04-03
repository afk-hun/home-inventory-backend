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

/** Creates a user + household directly in DB, then logs in via HTTP. */
async function loginAsNewUser(
	email = "user@test.com",
	password = "password123",
) {
	const hashed = await bcrypt.hash(password, 1);
	const user = await prisma.user.create({ data: { name: "Test User", email, password: hashed } });
	const _hh = await prisma.household.create({ data: { name: "Test Household", ownerId: user.id } });
	await prisma.householdMember.create({ data: { householdId: _hh.id, userId: user.id } });
	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });
	return user;
}

describe("GET /household/households", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get("/household/households")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns the user's households when authenticated", async () => {
		await loginAsNewUser();
		const csrf = await getCsrf();
		const res = await agent
			.get("/household/households")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(200);
		expect(res.body.households).toHaveLength(1);
		expect(res.body.households[0].name).toBe("Test Household");
	});
});

describe("POST /household/create", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/household/create")
			.set("x-csrf-token", csrf)
			.send({ name: "New House" });
		expect(res.status).toBe(401);
	});

	it("creates a new household and returns 201", async () => {
		await loginAsNewUser();
		const csrf = await getCsrf();
		const res = await agent
			.post("/household/create")
			.set("x-csrf-token", csrf)
			.send({ name: "Summer Cabin" });
		expect(res.status).toBe(201);
		expect(res.body.household.name).toBe("Summer Cabin");
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser();
		const csrf = await getCsrf();
		const res = await agent
			.post("/household/create")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});
});

describe("PATCH /household/rename", () => {
	it("renames an existing household", async () => {
		await loginAsNewUser();
		const csrf = await getCsrf();

		// Get the household that was created during login setup
		const listRes = await agent
			.get("/household/households")
			.set("x-csrf-token", csrf);
		const householdId = listRes.body.households[0]._id;

		const csrf2 = await getCsrf();
		const res = await agent
			.patch("/household/rename")
			.set("x-csrf-token", csrf2)
			.send({ householdId, name: "Renamed House" });
		expect(res.status).toBe(200);
	});

	it("returns 400 when required fields are missing", async () => {
		await loginAsNewUser();
		const csrf = await getCsrf();
		const res = await agent
			.patch("/household/rename")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});
});

describe("DELETE /household/remove", () => {
	it("deletes an existing household", async () => {
		await loginAsNewUser();
		const csrf = await getCsrf();

		// Create a second household to delete (so the user still has one)
		const createRes = await agent
			.post("/household/create")
			.set("x-csrf-token", csrf)
			.send({ name: "To Delete" });
		const householdId = createRes.body.household._id;

		const csrf2 = await getCsrf();
		const res = await agent
			.delete("/household/remove")
			.set("x-csrf-token", csrf2)
			.send({ householdId });
		expect(res.status).toBe(200);
	});

	it("returns 400 when householdId is missing", async () => {
		await loginAsNewUser();
		const csrf = await getCsrf();
		const res = await agent
			.delete("/household/remove")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});
});
