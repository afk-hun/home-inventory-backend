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

/** Creates a user + household in DB, logs in via HTTP. */
async function loginAsNewUser(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const user = await prisma.user.create({ data: { name: "Invoice User", email, password: hashed } });
	const _hh = await prisma.household.create({ data: { name: "Invoice Household", ownerId: user.id } });
	await prisma.householdMember.create({ data: { householdId: _hh.id, userId: user.id } });
	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });
	return user;
}

/** Creates a real store via API, then creates an invoice for it. Requires a logged-in agent. */
async function createInvoiceViaApi(storeName: string) {
	let csrf = await getCsrf();
	const storeRes = await agent
		.post("/store/store")
		.set("x-csrf-token", csrf)
		.send({ name: storeName });
	const storeId = storeRes.body.store._id;

	csrf = await getCsrf();
	const res = await agent
		.post("/invoice/invoice")
		.set("x-csrf-token", csrf)
		.send({
			storeId,
			storeName,
			storeAddress: "123 Test St",
			purchaseDate: "2024-01-01",
			invoiceItems: [],
		});
	return res;
}

// ---------------------------------------------------------------------------
// GET /invoice/invoice
// ---------------------------------------------------------------------------

describe("GET /invoice/invoice", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get("/invoice/invoice")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with invoices array when authenticated", async () => {
		await loginAsNewUser("inv-get-200@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.get("/invoice/invoice")
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.invoices)).toBe(true);
	});

	it("returns 200 filtered by storeId", async () => {
		await loginAsNewUser("inv-get-filter@test.com");
		// Use a fake storeId that won't match any invoice — the endpoint should still return 200 with an empty array
		const csrf = await getCsrf();
		const res = await agent
			.get(`/invoice/invoice?storeId=nonexistent-store-id`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.invoices)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// POST /invoice/invoice
// ---------------------------------------------------------------------------

describe("POST /invoice/invoice", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({
				storeId: "nonexistent-id",
				storeName: "Costco",
				storeAddress: "1 Warehouse Blvd",
				purchaseDate: "2024-04-01",
			});
		expect(res.status).toBe(401);
	});

	it("returns 400 when required fields are missing", async () => {
		await loginAsNewUser("inv-create-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ storeName: "Costco" }); // missing storeId, storeAddress and purchaseDate
		expect(res.status).toBe(400);
	});

	it("returns 201 with invoice in response on valid create", async () => {
		await loginAsNewUser("inv-create-201@test.com");

		// Create a real store first (FK constraint)
		let csrf = await getCsrf();
		const storeRes = await agent
			.post("/store/store")
			.set("x-csrf-token", csrf)
			.send({ name: "Target" });
		const storeId = storeRes.body.store._id;

		csrf = await getCsrf();
		const res = await agent
			.post("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({
				storeId,
				storeName: "Target",
				storeAddress: "100 Commerce Ave",
				purchaseDate: "2024-07-20",
			});

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Invoice created!");
		expect(res.body.invoice).toBeDefined();
		expect(res.body.invoice.storeName).toBe("Target");
		expect(res.body.invoice._id).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// PATCH /invoice/invoice
// ---------------------------------------------------------------------------

describe("PATCH /invoice/invoice", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.patch("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ invoiceId: "nonexistent-id" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when invoiceId is missing", async () => {
		await loginAsNewUser("inv-patch-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ storeName: "No ID Provided" });
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent invoice id", async () => {
		await loginAsNewUser("inv-patch-404@test.com");
		const fakeId = "nonexistent-id";
		const csrf = await getCsrf();
		const res = await agent
			.patch("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ invoiceId: fakeId, storeName: "Ghost Store" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with updated invoice on valid update", async () => {
		await loginAsNewUser("inv-patch-200@test.com");

		// Create an invoice via the API
		const createRes = await createInvoiceViaApi("Old Name");
		expect(createRes.status).toBe(201);
		const invoiceId = createRes.body.invoice._id;

		const csrf = await getCsrf();
		const res = await agent
			.patch("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({
				invoiceId,
				storeName: "New Name",
			});

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Invoice updated successfully");
		expect(res.body.invoice.storeName).toBe("New Name");
	});
});

// ---------------------------------------------------------------------------
// DELETE /invoice/invoice
// ---------------------------------------------------------------------------

describe("DELETE /invoice/invoice", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.delete("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ invoiceId: "nonexistent-id" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when invoiceId is missing", async () => {
		await loginAsNewUser("inv-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({});
		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent invoice id", async () => {
		await loginAsNewUser("inv-delete-404@test.com");
		const fakeId = "nonexistent-id";
		const csrf = await getCsrf();
		const res = await agent
			.delete("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ invoiceId: fakeId });
		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		await loginAsNewUser("inv-delete-200@test.com");

		// Create an invoice via the API
		const createRes = await createInvoiceViaApi("Doomed Store");
		expect(createRes.status).toBe(201);
		const invoiceId = createRes.body.invoice._id;

		const csrf = await getCsrf();
		const res = await agent
			.delete("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ invoiceId });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Invoice deleted successfully");
	});
});
