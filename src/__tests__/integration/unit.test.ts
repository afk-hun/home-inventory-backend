import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
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

async function loginAsNewUser(email = "unit-user@test.com") {
	const password = "password123";
	const hashed = await bcrypt.hash(password, 1);
	const user = await new User({
		name: "Unit User",
		email,
		password: hashed,
	}).save();
	await new Household({
		name: "Unit Household",
		owner: user,
		members: [user],
	}).save();
	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });
}

// ---------------------------------------------------------------------------
// Unit Types
// ---------------------------------------------------------------------------

describe("Unit Types", () => {
	describe("GET /unit/unit-type", () => {
		it("returns 401 when not authenticated", async () => {
			const csrf = await getCsrf();
			const res = await agent
				.get("/unit/unit-type")
				.set("x-csrf-token", csrf);
			expect(res.status).toBe(401);
		});

		it("returns empty list initially", async () => {
			await loginAsNewUser("ut-list@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.get("/unit/unit-type")
				.set("x-csrf-token", csrf);
			expect(res.status).toBe(200);
			expect(res.body.unitTypes).toEqual([]);
		});
	});

	describe("POST /unit/unit-type", () => {
		it("creates a unit type and returns 201", async () => {
			await loginAsNewUser("ut-create@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.post("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ name: "Kilogram" });
			expect(res.status).toBe(201);
			expect(res.body.unitType.name).toBe("Kilogram");
		});

		it("returns 400 when name is missing", async () => {
			await loginAsNewUser("ut-missing@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.post("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({});
			expect(res.status).toBe(400);
		});

		it("created unit type appears in GET list", async () => {
			await loginAsNewUser("ut-appears@test.com");

			let csrf = await getCsrf();
			await agent
				.post("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ name: "Litre" });

			csrf = await getCsrf();
			const res = await agent
				.get("/unit/unit-type")
				.set("x-csrf-token", csrf);
			expect(res.status).toBe(200);
			expect(res.body.unitTypes).toHaveLength(1);
			expect(res.body.unitTypes[0].name).toBe("Litre");
		});
	});

	describe("PATCH /unit/unit-type", () => {
		it("renames a unit type", async () => {
			await loginAsNewUser("ut-rename@test.com");

			let csrf = await getCsrf();
			const createRes = await agent
				.post("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ name: "Gram" });
			const unitTypeId = createRes.body.unitType._id;

			csrf = await getCsrf();
			const res = await agent
				.patch("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ unitTypeId, name: "Milligram" });
			expect(res.status).toBe(200);
		});

		it("returns 404 for a non-existent unit type", async () => {
			await loginAsNewUser("ut-404@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.patch("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ unitTypeId: "000000000000000000000001", name: "Ghost" });
			expect(res.status).toBe(404);
		});

		it("returns 400 when required fields are missing", async () => {
			await loginAsNewUser("ut-patch-missing@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.patch("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({});
			expect(res.status).toBe(400);
		});
	});

	describe("DELETE /unit/unit-type", () => {
		it("deletes a unit type", async () => {
			await loginAsNewUser("ut-delete@test.com");

			let csrf = await getCsrf();
			const createRes = await agent
				.post("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ name: "To Delete" });
			const unitTypeId = createRes.body.unitType._id;

			csrf = await getCsrf();
			const res = await agent
				.delete("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ unitTypeId });
			expect(res.status).toBe(200);
		});

		it("deleted unit type no longer appears in GET list", async () => {
			await loginAsNewUser("ut-del-gone@test.com");

			let csrf = await getCsrf();
			const createRes = await agent
				.post("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ name: "Temp" });
			const unitTypeId = createRes.body.unitType._id;

			csrf = await getCsrf();
			await agent
				.delete("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({ unitTypeId });

			csrf = await getCsrf();
			const listRes = await agent
				.get("/unit/unit-type")
				.set("x-csrf-token", csrf);
			expect(listRes.body.unitTypes).toHaveLength(0);
		});

		it("returns 400 when unitTypeId is missing", async () => {
			await loginAsNewUser("ut-del-missing@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.delete("/unit/unit-type")
				.set("x-csrf-token", csrf)
				.send({});
			expect(res.status).toBe(400);
		});
	});
});
