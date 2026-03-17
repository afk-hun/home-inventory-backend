import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level save mock — tests can replace the resolved value as needed
let mockSave = vi.fn();

vi.mock("../../../models/invoice", () => {
	const findById = vi.fn();
	const findByIdAndDelete = vi.fn();

	// Must be a regular function (not arrow) so `new Invoice(...)` works.
	// Vitest requires vi.fn() for mockImplementationOnce; wrapping the
	// regular function inside vi.fn() satisfies both constraints.
	const MockInvoice = vi.fn(function MockInvoiceImpl(this: any, data: any) {
		Object.assign(this, data);
		// `mockSave` is captured by reference — tests can set mockSave.mockResolvedValue(...)
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockInvoice as any).findById = findById;
	(MockInvoice as any).findByIdAndDelete = findByIdAndDelete;

	return { default: MockInvoice };
});

import Invoice from "../../../models/invoice";
import {
	getInvoice,
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
// getInvoice
// ---------------------------------------------------------------------------

describe("getInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, params: { id: "some-id" } };
		const res = makeMockRes();
		const next = vi.fn();

		getInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when id param is missing", () => {
		const req: any = {
			user: { _id: "user-1" },
			params: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		getInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Invoice.findById returns null", async () => {
		(Invoice.findById as any).mockResolvedValue(null);

		const req: any = {
			user: { _id: "user-1" },
			params: { id: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getInvoice(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with invoice on success", async () => {
		const mockDoc = {
			_id: "invoice-1",
			storeName: "Costco",
			storeAddress: "123 Main St",
			purchaseDate: new Date("2024-01-01"),
			invoiceItems: [],
		};
		(Invoice.findById as any).mockResolvedValue(mockDoc);

		const req: any = {
			user: { _id: "user-1" },
			params: { id: "invoice-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getInvoice(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({ invoice: mockDoc });
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createInvoice
// ---------------------------------------------------------------------------

describe("createInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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
			user: { _id: "user-1" },
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
			user: { _id: "user-1" },
			householdId: "household-1",
			body: { storeName: "Walmart" }, // missing storeId, storeAddress and purchaseDate
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
			user: { _id: "user-1" },
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
			_id: "new-invoice-id",
			householdId: "household-1",
			storeId: "store-1",
			storeName: "Target",
			storeAddress: "789 Elm St",
			purchaseDate: new Date("2024-03-15"),
			invoiceItems: [],
		};

		// Point the shared save mock at our resolved value
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			user: { _id: "user-1" },
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
		expect(res.json).toHaveBeenCalledWith({
			message: "Invoice created!",
			invoice: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateInvoice
// ---------------------------------------------------------------------------

describe("updateInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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

	it("calls next with 404 when Invoice.findById returns null", async () => {
		(Invoice.findById as any).mockResolvedValue(null);

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
		const updatedDoc = {
			_id: "invoice-1",
			storeName: "Updated Store",
			storeAddress: "123 Main St",
			purchaseDate: new Date("2024-01-01"),
			invoiceItems: [],
		};

		const mockFoundDoc: any = {
			_id: "invoice-1",
			storeName: "Old Store",
			storeAddress: "123 Main St",
			purchaseDate: new Date("2024-01-01"),
			invoiceItems: [],
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(Invoice.findById as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			body: { invoiceId: "invoice-1", storeName: "Updated Store" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateInvoice(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Invoice updated successfully",
			invoice: updatedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteInvoice
// ---------------------------------------------------------------------------

describe("deleteInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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

	it("calls next with 404 when Invoice.findByIdAndDelete returns null", async () => {
		(Invoice.findByIdAndDelete as any).mockResolvedValue(null);

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
		const deletedDoc = {
			_id: "invoice-1",
			storeName: "Costco",
			storeAddress: "123 Main St",
			purchaseDate: new Date("2024-01-01"),
			invoiceItems: [],
		};
		(Invoice.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

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
