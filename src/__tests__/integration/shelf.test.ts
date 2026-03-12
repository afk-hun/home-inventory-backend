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

async function loginAsNewUser(email = "shelf-user@test.com") {
	const password = "password123";
	const hashed = await bcrypt.hash(password, 1);
	const user = await new User({
		name: "Shelf User",
		email,
		password: hashed,
	}).save();
	await new Household({
		name: "Shelf Household",
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
// Shelf Types
// ---------------------------------------------------------------------------

describe("Shelf Types", () => {
	describe("GET /shelf/shelf-types", () => {
		it("returns 401 when not authenticated", async () => {
			const csrf = await getCsrf();
			const res = await agent
				.get("/shelf/shelf-types")
				.set("x-csrf-token", csrf);
			expect(res.status).toBe(401);
		});

		it("returns empty list initially", async () => {
			await loginAsNewUser();
			const csrf = await getCsrf();
			const res = await agent
				.get("/shelf/shelf-types")
				.set("x-csrf-token", csrf);
			expect(res.status).toBe(200);
			expect(res.body.shelfTypes).toEqual([]);
		});
	});

	describe("POST /shelf/shelf-types", () => {
		it("creates a shelf type and returns 201", async () => {
			await loginAsNewUser("st-create@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.post("/shelf/shelf-types")
				.set("x-csrf-token", csrf)
				.send({ name: "Fridge" });
			expect(res.status).toBe(201);
			expect(res.body.shelfType.name).toBe("Fridge");
		});

		it("returns 400 when name is missing", async () => {
			await loginAsNewUser("st-missing@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.post("/shelf/shelf-types")
				.set("x-csrf-token", csrf)
				.send({});
			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /shelf/shelf-types", () => {
		it("renames a shelf type", async () => {
			await loginAsNewUser("st-rename@test.com");

			let csrf = await getCsrf();
			const createRes = await agent
				.post("/shelf/shelf-types")
				.set("x-csrf-token", csrf)
				.send({ name: "Pantry" });
			const shelfTypeId = createRes.body.shelfType._id;

			csrf = await getCsrf();
			const res = await agent
				.patch("/shelf/shelf-types")
				.set("x-csrf-token", csrf)
				.send({ shelfTypeId, name: "Cupboard" });
			expect(res.status).toBe(200);
		});

		it("returns 404 for a non-existent shelf type", async () => {
			await loginAsNewUser("st-404@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.patch("/shelf/shelf-types")
				.set("x-csrf-token", csrf)
				.send({ shelfTypeId: "000000000000000000000001", name: "Ghost" });
			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /shelf/shelf-types", () => {
		it("deletes a shelf type", async () => {
			await loginAsNewUser("st-delete@test.com");

			let csrf = await getCsrf();
			const createRes = await agent
				.post("/shelf/shelf-types")
				.set("x-csrf-token", csrf)
				.send({ name: "To Delete" });
			const shelfTypeId = createRes.body.shelfType._id;

			csrf = await getCsrf();
			const res = await agent
				.delete("/shelf/shelf-types")
				.set("x-csrf-token", csrf)
				.send({ shelfTypeId });
			expect(res.status).toBe(200);
		});

		it("returns 400 when shelfTypeId is missing", async () => {
			await loginAsNewUser("st-del-missing@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.delete("/shelf/shelf-types")
				.set("x-csrf-token", csrf)
				.send({});
			expect(res.status).toBe(400);
		});
	});
});

// ---------------------------------------------------------------------------
// Shelf Place Types
// ---------------------------------------------------------------------------

describe("Shelf Place Types", () => {
	describe("GET /shelf/shelf-place-types", () => {
		it("returns empty list initially", async () => {
			await loginAsNewUser("spt-list@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.get("/shelf/shelf-place-types")
				.set("x-csrf-token", csrf);
			expect(res.status).toBe(200);
			expect(res.body.shelfPlaces).toEqual([]);
		});
	});

	describe("POST /shelf/shelf-place-types", () => {
		it("creates a shelf place type and returns 201", async () => {
			await loginAsNewUser("spt-create@test.com");
			const csrf = await getCsrf();
			const res = await agent
				.post("/shelf/shelf-place-types")
				.set("x-csrf-token", csrf)
				.send({ name: "Top Shelf" });
			expect(res.status).toBe(201);
			expect(res.body.shelfPlaceType.name).toBe("Top Shelf");
		});
	});

	describe("PATCH /shelf/shelf-place-types", () => {
		it("renames a shelf place type", async () => {
			await loginAsNewUser("spt-rename@test.com");

			let csrf = await getCsrf();
			const createRes = await agent
				.post("/shelf/shelf-place-types")
				.set("x-csrf-token", csrf)
				.send({ name: "Bottom" });
			const shelfPlaceTypeId = createRes.body.shelfPlaceType._id;

			csrf = await getCsrf();
			const res = await agent
				.patch("/shelf/shelf-place-types")
				.set("x-csrf-token", csrf)
				.send({ shelfPlaceTypeId, name: "Middle" });
			expect(res.status).toBe(200);
		});
	});

	describe("DELETE /shelf/shelf-place-types", () => {
		it("deletes a shelf place type", async () => {
			await loginAsNewUser("spt-delete@test.com");

			let csrf = await getCsrf();
			const createRes = await agent
				.post("/shelf/shelf-place-types")
				.set("x-csrf-token", csrf)
				.send({ name: "Removable" });
			const shelfPlaceTypeId = createRes.body.shelfPlaceType._id;

			csrf = await getCsrf();
			const res = await agent
				.delete("/shelf/shelf-place-types")
				.set("x-csrf-token", csrf)
				.send({ shelfPlaceTypeId });
			expect(res.status).toBe(200);
		});
	});
});
