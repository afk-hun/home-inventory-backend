import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

let agent: ReturnType<typeof request.agent>;

beforeEach(() => {
	agent = request.agent(app);
});

async function getCsrf() {
	const res = await agent.get("/auth/csrf-token");
	return res.body.csrfToken as string;
}

describe("GET /health", () => {
	it("returns ok", async () => {
		const res = await request(app).get("/health");
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "ok" });
	});
});

describe("GET /auth/csrf-token", () => {
	it("returns a CSRF token and sets cookies", async () => {
		const res = await agent.get("/auth/csrf-token");
		expect(res.status).toBe(200);
		expect(res.body.csrfToken).toBeDefined();
		expect(res.headers["set-cookie"]).toBeDefined();
	});
});

describe("POST /auth/signup", () => {
	it("returns 403 without CSRF token", async () => {
		const res = await agent.post("/auth/signup").send({
			name: "Alice",
			email: "alice@test.com",
			password: "password123",
		});
		expect(res.status).toBe(403);
	});

	it("returns 422 with invalid email", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/auth/signup")
			.set("x-csrf-token", csrf)
			.send({ name: "Alice", email: "not-an-email", password: "password123" });
		expect(res.status).toBe(422);
	});

	it("returns 422 with a password that is too short", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/auth/signup")
			.set("x-csrf-token", csrf)
			.send({ name: "Alice", email: "alice@test.com", password: "123" });
		expect(res.status).toBe(422);
	});

	it("creates a user and returns 201", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/auth/signup")
			.set("x-csrf-token", csrf)
			.send({
				name: "Alice",
				email: "alice@test.com",
				password: "password123",
			});
		expect(res.status).toBe(201);
		expect(res.body.userId).toBeDefined();
	});

	it("returns 422 when email already exists", async () => {
		const csrf = await getCsrf();
		const payload = {
			name: "Alice",
			email: "duplicate@test.com",
			password: "password123",
		};
		await agent.post("/auth/signup").set("x-csrf-token", csrf).send(payload);

		const csrf2 = await getCsrf();
		const res = await agent
			.post("/auth/signup")
			.set("x-csrf-token", csrf2)
			.send(payload);
		expect(res.status).toBe(422);
	});
});

describe("POST /auth/login", () => {
	it("returns 401 with wrong password", async () => {
		// First create a user directly via signup
		const csrf = await getCsrf();
		await agent.post("/auth/signup").set("x-csrf-token", csrf).send({
			name: "Bob",
			email: "bob@test.com",
			password: "correctpassword",
		});

		const csrf2 = await getCsrf();
		const res = await agent
			.post("/auth/login")
			.set("x-csrf-token", csrf2)
			.send({ email: "bob@test.com", password: "wrongpassword" });
		expect(res.status).toBe(401);
	});

	it("returns 403 without CSRF token", async () => {
		const res = await agent
			.post("/auth/login")
			.send({ email: "a@a.com", password: "password123" });
		expect(res.status).toBe(403);
	});
});

describe("POST /auth/refresh", () => {
	it("returns 401 when no refresh token cookie exists", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/auth/refresh")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});
});

describe("POST /auth/logout", () => {
	it("returns 403 without CSRF token", async () => {
		const res = await agent.post("/auth/logout");
		expect(res.status).toBe(403);
	});

	it("returns 200 and clears cookies", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/auth/logout")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Logged out successfully.");
	});
});
