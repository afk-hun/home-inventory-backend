import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		invoice: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		invoiceElement: {
			deleteMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}));

import { prisma } from "../../../lib/prisma";
import {
	getInvoices,
	createInvoice,
	updateInvoice,
	deleteInvoice,
} from "../../../controller/invoice";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getInvoices
// ---------------------------------------------------------------------------

describe("getInvoices", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = { householdId: undefined, query: {} };
		const res = makeMockRes();
		const next = vi.fn();

		getInvoices(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with all invoices when no storeId provided", async () => {
		const mockDocs = [
			{ id: "invoice-1", storeName: "Costco", storeAddress: "123 Main St", purchaseDate: new Date(), householdId: "household-1", storeId: "store-1", invoiceItems: [] },
		];
		(prisma.invoice.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { householdId: "household-1", query: {} };
		const res = makeMockRes();
		const next = vi.fn();

		getInvoices(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.invoices[0]._id).toBe("invoice-1");
		expect(jsonArg.invoices[0].invoiceItems).toEqual([]);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 200 with filtered invoices when storeId provided", async () => {
		const mockDocs = [
			{ id: "invoice-2", storeName: "Target", storeAddress: "456 Oak Ave", purchaseDate: new Date(), householdId: "household-1", storeId: "store-1", invoiceItems: [] },
		];
		(prisma.invoice.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { householdId: "household-1", query: { storeId: "store-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getInvoices(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.invoices[0]._id).toBe("invoice-2");
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createInvoice
// ---------------------------------------------------------------------------

describe("createInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = {
			user: undefined,
			householdId: "household-1",
			body: {
				storeId: "store-1",
				storeName: "Walmart",
				storeAddress: "456 Oak Ave",
				purchaseDate: "2024-06-01",
			},
		};
		const res = makeMockRes();
		const next = vi.fn();

		createInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: undefined,
			body: {
				storeId: "store-1",
				storeName: "Walmart",
				storeAddress: "456 Oak Ave",
				purchaseDate: "2024-06-01",
			},
		};
		const res = makeMockRes();
		const next = vi.fn();

		createInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when required fields are missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			body: { storeName: "Walmart" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when storeId is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			body: { storeName: "Walmart", storeAddress: "456 Oak Ave", purchaseDate: "2024-06-01" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 201 with invoice on success", async () => {
		const savedDoc = {
			id: "new-invoice-id",
			householdId: "household-1",
			storeId: "store-1",
			storeName: "Target",
			storeAddress: "789 Elm St",
			purchaseDate: new Date("2024-03-15"),
			invoiceItems: [],
		};

		(prisma.invoice.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			body: {
				storeId: "store-1",
				storeName: "Target",
				storeAddress: "789 Elm St",
				purchaseDate: "2024-03-15",
			},
		};
		const res = makeMockRes();
		const next = vi.fn();

		createInvoice(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Invoice created!");
		expect(jsonArg.invoice._id).toBe("new-invoice-id");
		expect(jsonArg.invoice.invoiceItems).toEqual([]);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateInvoice
// ---------------------------------------------------------------------------

describe("updateInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when invoiceId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		updateInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when invoice is not found", async () => {
		(prisma.invoice.findUnique as any).mockResolvedValue(null);

		const req: any = {
			body: { invoiceId: "nonexistent-id", storeName: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateInvoice(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated invoice on success", async () => {
		const existingDoc = {
			id: "invoice-1",
			storeName: "Old Store",
			storeAddress: "123 Main St",
			purchaseDate: new Date("2024-01-01"),
			householdId: "household-1",
			storeId: "store-1",
		};
		const updatedDoc = {
			id: "invoice-1",
			storeName: "Updated Store",
			storeAddress: "123 Main St",
			purchaseDate: new Date("2024-01-01"),
			householdId: "household-1",
			storeId: "store-1",
			invoiceItems: [],
		};

		(prisma.invoice.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.invoice.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			body: { invoiceId: "invoice-1", storeName: "Updated Store" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateInvoice(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Invoice updated successfully");
		expect(jsonArg.invoice._id).toBe("invoice-1");
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteInvoice
// ---------------------------------------------------------------------------

describe("deleteInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when invoiceId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when invoice is not found", async () => {
		(prisma.invoice.findUnique as any).mockResolvedValue(null);

		const req: any = { body: { invoiceId: "nonexistent-id" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteInvoice(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = {
			id: "invoice-1",
			storeName: "Costco",
			storeAddress: "123 Main St",
			purchaseDate: new Date("2024-01-01"),
			householdId: "household-1",
			storeId: "store-1",
		};
		(prisma.invoice.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.invoice.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { invoiceId: "invoice-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteInvoice(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Invoice deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});
});
