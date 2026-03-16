import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level save mock — individual tests can override the resolved value
let mockSave = vi.fn();

vi.mock("../../../../models/item", () => {
	const findOne = vi.fn();
	const findOneAndDelete = vi.fn();
	const countDocuments = vi.fn();

	// Must be a regular function (not arrow) so `new Item(...)` works.
	const MockItem = vi.fn(function MockItemImpl(this: any, data: any) {
		Object.assign(this, data);
		this.connectedStores = data?.connectedStores ?? [];
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockItem as any).findOne = findOne;
	(MockItem as any).findOneAndDelete = findOneAndDelete;
	(MockItem as any).countDocuments = countDocuments;
	(MockItem as any).find = vi.fn().mockReturnValue({
		skip: vi.fn().mockReturnValue({
			limit: vi.fn().mockReturnValue(Promise.resolve([])),
		}),
	});

	return { default: MockItem };
});

vi.mock("../../../../models/store", () => {
	const findOne = vi.fn();

	const MockStore = vi.fn(function MockStoreImpl(this: any, data: any) {
		Object.assign(this, data);
	});

	(MockStore as any).findOne = findOne;

	return { default: MockStore };
});

import Item from "../../../../models/item";
import Store from "../../../../models/store";
import {
	getItems,
	getItem,
	createItem,
	updateItem,
	deleteItem,
	addConnectedStore,
} from "../../../../controller/shelf/item";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getItems
// ---------------------------------------------------------------------------

describe("getItems", () => {
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

		getItems(req, res, next);

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

		getItems(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with items and pagination shape on success", async () => {
		const mockItems = [
			{ _id: "item-1", name: "Milk", householdId: "household-1", connectedStores: [] },
			{ _id: "item-2", name: "Bread", householdId: "household-1", connectedStores: [] },
		];

		(Item.countDocuments as any).mockResolvedValue(2);
		(Item.find as any).mockReturnValue({
			skip: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue(mockItems),
			}),
		});

		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			query: { page: "1", limit: "5" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getItems(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.items).toEqual(mockItems);
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
// getItem
// ---------------------------------------------------------------------------

describe("getItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { _id: "user-1" },
			householdId: undefined,
			params: { id: "item-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Item.findOne returns null", async () => {
		(Item.findOne as any).mockReturnValue({
			populate: vi.fn().mockResolvedValue(null),
		});

		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			params: { id: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getItem(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with item on success", async () => {
		const mockDoc = {
			_id: "item-1",
			householdId: "household-1",
			name: "Milk",
			connectedStores: [],
		};

		(Item.findOne as any).mockReturnValue({
			populate: vi.fn().mockResolvedValue(mockDoc),
		});

		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			params: { id: "item-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({ item: mockDoc });
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createItem
// ---------------------------------------------------------------------------

describe("createItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { _id: "user-1" },
			householdId: undefined,
			body: { name: "Eggs" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			body: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		createItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with item on success", async () => {
		const savedDoc = {
			_id: "new-item-id",
			householdId: "household-1",
			name: "Eggs",
			connectedStores: [],
		};

		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			user: { _id: "user-1" },
			householdId: "household-1",
			body: { name: "Eggs" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Item created!",
			item: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

describe("updateItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when itemId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { name: "No ID" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Item.findOne returns null", async () => {
		(Item.findOne as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "nonexistent-id", name: "Ghost" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateItem(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated item on success", async () => {
		const updatedDoc = {
			_id: "item-1",
			householdId: "household-1",
			name: "Updated Milk",
			connectedStores: [],
		};

		const mockFoundDoc: any = {
			_id: "item-1",
			householdId: "household-1",
			name: "Old Milk",
			connectedStores: [],
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(Item.findOne as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1", name: "Updated Milk" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Item updated successfully",
			item: updatedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------

describe("deleteItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when itemId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Item.findOneAndDelete returns null", async () => {
		(Item.findOneAndDelete as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteItem(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const deletedDoc = {
			_id: "item-1",
			householdId: "household-1",
			name: "Milk",
			connectedStores: [],
		};
		(Item.findOneAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Item deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// addConnectedStore
// ---------------------------------------------------------------------------

describe("addConnectedStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when itemId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1", storeItemId: "SKU-001" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addConnectedStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when storeId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1", storeItemId: "SKU-001" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addConnectedStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when storeItemId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1", storeId: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addConnectedStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Store.findOne returns null", async () => {
		(Store.findOne as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1", storeId: "nonexistent-store", storeItemId: "SKU-001" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addConnectedStore(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when Item.findOne returns null", async () => {
		const mockStore = {
			_id: "store-1",
			householdId: "household-1",
			name: "Walmart",
		};
		(Store.findOne as any).mockResolvedValue(mockStore);
		(Item.findOne as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "nonexistent-item", storeId: "store-1", storeItemId: "SKU-001" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addConnectedStore(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated item containing connectedStores on success", async () => {
		const mockStore = {
			_id: "store-1",
			householdId: "household-1",
			name: "Walmart",
		};

		const updatedDoc = {
			_id: "item-1",
			householdId: "household-1",
			name: "Milk",
			connectedStores: [
				{ storeId: "store-1", storeName: "Walmart", storeItemId: "SKU-001" },
			],
		};

		const mockFoundItem: any = {
			_id: "item-1",
			householdId: "household-1",
			name: "Milk",
			connectedStores: { push: vi.fn() },
			save: vi.fn().mockResolvedValue(updatedDoc),
		};

		(Store.findOne as any).mockResolvedValue(mockStore);
		(Item.findOne as any).mockResolvedValue(mockFoundItem);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1", storeId: "store-1", storeItemId: "SKU-001" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addConnectedStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Store added to item",
			item: updatedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});
