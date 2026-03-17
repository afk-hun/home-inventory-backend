import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../app";
import User from "../../models/user";
import Household from "../../models/household";
import Invoice from "../../models/invoice";
import mongoose, { Types } from "mongoose";

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
	const user = await new User({
		name: "Invoice User",
		email,
		password: hashed,
	}).save();

	await new Household({
		name: "Invoice Household",
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
		const storeId = new Types.ObjectId();

		await new Invoice({
			householdId: new Types.ObjectId(),
			storeId,
			storeName: "Grocery World",
			storeAddress: "42 Market St",
			purchaseDate: new Date("2024-05-10"),
			invoiceItems: [],
		}).save();

		const csrf = await getCsrf();
		const res = await agent
			.get(`/invoice/invoice?storeId=${storeId.toHexString()}`)
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
				storeId: new Types.ObjectId().toHexString(),
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
		const csrf = await getCsrf();
		const res = await agent
			.post("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({
				storeId: new Types.ObjectId().toHexString(),
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
			.send({ invoiceId: new mongoose.Types.ObjectId().toHexString() });
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
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.patch("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ invoiceId: fakeId, storeName: "Ghost Store" });
		expect(res.status).toBe(404);
	});

	it("returns 200 with updated invoice on valid update", async () => {
		await loginAsNewUser("inv-patch-200@test.com");

		// Create an invoice to update (householdId and storeId are required)
		const invoice = await new Invoice({
			householdId: new Types.ObjectId(),
			storeId: new Types.ObjectId(),
			storeName: "Old Name",
			storeAddress: "Old Address",
			purchaseDate: new Date("2024-01-01"),
			invoiceItems: [],
		}).save();

		const csrf = await getCsrf();
		const res = await agent
			.patch("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({
				invoiceId: invoice._id.toHexString(),
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
			.send({ invoiceId: new mongoose.Types.ObjectId().toHexString() });
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
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.delete("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ invoiceId: fakeId });
		expect(res.status).toBe(404);
	});

	it("returns 200 on successful deletion", async () => {
		await loginAsNewUser("inv-delete-200@test.com");

		// Create an invoice to delete (householdId and storeId are required)
		const invoice = await new Invoice({
			householdId: new Types.ObjectId(),
			storeId: new Types.ObjectId(),
			storeName: "Doomed Store",
			storeAddress: "Nowhere Lane",
			purchaseDate: new Date("2024-02-14"),
			invoiceItems: [],
		}).save();

		const csrf = await getCsrf();
		const res = await agent
			.delete("/invoice/invoice")
			.set("x-csrf-token", csrf)
			.send({ invoiceId: invoice._id.toHexString() });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Invoice deleted successfully");
	});
});
