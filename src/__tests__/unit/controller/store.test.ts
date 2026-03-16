import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level save mock — tests can replace the resolved value as needed
let mockSave = vi.fn();

vi.mock("../../../models/store", () => {
	const findOne = vi.fn();
	const find = vi.fn();
	const countDocuments = vi.fn();
	const findOneAndDelete = vi.fn();

	// Must be a regular function (not arrow) so `new Store(...)` works.
	const MockStore = vi.fn(function MockStoreImpl(this: any, data: any) {
		Object.assign(this, data);
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockStore as any).findOne = findOne;
	(MockStore as any).find = vi.fn().mockReturnValue({
		skip: vi.fn().mockReturnValue({
			limit: vi.fn().mockReturnValue(Promise.resolve([])),
		}),
	});
	(MockStore as any).countDocuments = countDocuments;
	(MockStore as any).findOneAndDelete = findOneAndDelete;

	return { default: MockStore };
});

vi.mock("../../../models/invoice", () => {
	const findById = vi.fn();

	const MockInvoice = vi.fn(function MockInvoiceImpl(this: any, data: any) {
		Object.assign(this, data);
	});

	(MockInvoice as any).findById = findById;

	return { default: MockInvoice };
});

import Store from "../../../models/store";
import Invoice from "../../../models/invoice";
import {
	getStore,
	getStores,
	createStore,
	updateStore,
	deleteStore,
	addInvoice,
} from "../../../controller/store";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getStore
// ---------------------------------------------------------------------------

describe("getStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = {
			user: undefined,
			householdId: "household-1",
			params: { id: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { _id: "user-1" },
			householdId: undefined,
			params: { id: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Store.findOne returns null", async () => {
		(Store.findOne as any).mockResolvedValue(null);

		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			params: { id: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStore(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with store on success", async () => {
		const mockDoc = {
			_id: "store-1",
			householdId: "household-1",
			id: "S001",
			name: "Costco",
			invoices: [],
		};
		(Store.findOne as any).mockResolvedValue(mockDoc);

		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			params: { id: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({ store: mockDoc });
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// getStores
// ---------------------------------------------------------------------------

describe("getStores", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = {
			user: undefined,
			householdId: "household-1",
			query: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStores(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { _id: "user-1" },
			householdId: undefined,
			query: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStores(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with pagination shape on success", async () => {
		const mockStores = [
			{ _id: "store-1", name: "Costco", id: "S001", invoices: [] },
			{ _id: "store-2", name: "Target", id: "S002", invoices: [] },
		];

		(Store.countDocuments as any).mockResolvedValue(2);
		(Store.find as any).mockReturnValue({
			skip: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue(mockStores),
			}),
		});

		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			query: { page: "1", limit: "5" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStores(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.stores).toEqual(mockStores);
		expect(jsonArg.pagination).toMatchObject({
			total: 2,
			page: 1,
			limit: 5,
			totalPages: 1,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createStore
// ---------------------------------------------------------------------------

describe("createStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = {
			user: undefined,
			householdId: "household-1",
			body: { id: "S001", name: "Costco" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { _id: "user-1" },
			householdId: undefined,
			body: { id: "S001", name: "Costco" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			body: { id: "S001" }, // missing name
		};
		const res = makeMockRes();
		const next = vi.fn();

		createStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with store on success", async () => {
		const savedDoc = {
			_id: "new-store-id",
			householdId: "household-1",
			id: "S001",
			name: "Costco",
			invoices: [],
		};

		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			body: { id: "S001", name: "Costco" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Store created!",
			store: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateStore
// ---------------------------------------------------------------------------

describe("updateStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when storeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		updateStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Store.findOne returns null", async () => {
		(Store.findOne as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "nonexistent-id", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateStore(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated store on success", async () => {
		const updatedDoc = {
			_id: "store-1",
			householdId: "household-1",
			id: "S001",
			name: "Updated Costco",
			invoices: [],
		};

		const mockFoundDoc: any = {
			_id: "store-1",
			householdId: "household-1",
			id: "S001",
			name: "Old Costco",
			invoices: [],
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(Store.findOne as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1", name: "Updated Costco" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Store updated successfully",
			store: updatedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteStore
// ---------------------------------------------------------------------------

describe("deleteStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when storeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Store.findOneAndDelete returns null", async () => {
		(Store.findOneAndDelete as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteStore(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const deletedDoc = {
			_id: "store-1",
			householdId: "household-1",
			id: "S001",
			name: "Costco",
			invoices: [],
		};
		(Store.findOneAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Store deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// addInvoice
// ---------------------------------------------------------------------------

describe("addInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when storeId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { invoiceId: "invoice-1" }, // missing storeId
		};
		const res = makeMockRes();
		const next = vi.fn();

		addInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when invoiceId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1" }, // missing invoiceId
		};
		const res = makeMockRes();
		const next = vi.fn();

		addInvoice(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Invoice.findById returns null", async () => {
		(Invoice.findById as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1", invoiceId: "nonexistent-invoice" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addInvoice(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Store.findOne returns null", async () => {
		const mockInvoice = {
			_id: "invoice-1",
			storeName: "Costco",
			purchaseDate: new Date("2024-01-01"),
		};
		(Invoice.findById as any).mockResolvedValue(mockInvoice);
		(Store.findOne as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "nonexistent-store", invoiceId: "invoice-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addInvoice(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated store on success", async () => {
		const mockInvoice = {
			_id: "invoice-1",
			storeName: "Costco",
			purchaseDate: new Date("2024-01-01"),
		};

		const updatedDoc = {
			_id: "store-1",
			householdId: "household-1",
			id: "S001",
			name: "Costco",
			invoices: [
				{
					invoiceId: "invoice-1",
					storeName: "Costco",
					purchaseDate: new Date("2024-01-01"),
				},
			],
		};

		const mockFoundStore: any = {
			_id: "store-1",
			householdId: "household-1",
			id: "S001",
			name: "Costco",
			invoices: [],
			push: vi.fn(),
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		// invoices array with a push method
		mockFoundStore.invoices = { push: vi.fn() };

		(Invoice.findById as any).mockResolvedValue(mockInvoice);
		(Store.findOne as any).mockResolvedValue(mockFoundStore);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1", invoiceId: "invoice-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addInvoice(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Invoice added to store",
			store: updatedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});
