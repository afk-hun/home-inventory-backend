import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../lib/prisma", () => ({
	prisma: {
		item: {
			count: vi.fn(),
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		itemConnectedStore: {
			deleteMany: vi.fn(),
		},
		store: {
			findFirst: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}));

import { prisma } from "../../../../lib/prisma";
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
			user: { id: "user-1" },
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
			{ id: "item-1", name: "Milk", householdId: "household-1", connectedStores: [] },
			{ id: "item-2", name: "Bread", householdId: "household-1", connectedStores: [] },
		];

		(prisma.item.count as any).mockResolvedValue(2);
		(prisma.item.findMany as any).mockResolvedValue(mockItems);

		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			query: { page: "1", limit: "5" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getItems(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.items[0]._id).toBe("item-1");
		expect(jsonArg.items[0].connectedStores).toEqual([]);
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
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { id: "user-1" },
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

	it("calls next with 404 when item is not found", async () => {
		(prisma.item.findFirst as any).mockResolvedValue(null);

		const req: any = {
			user: { id: "user-1" },
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
			id: "item-1",
			householdId: "household-1",
			name: "Milk",
			type: null,
			connectedStores: [],
		};
		(prisma.item.findFirst as any).mockResolvedValue(mockDoc);

		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			params: { id: "item-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.item._id).toBe("item-1");
		expect(jsonArg.item.connectedStores).toEqual([]);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createItem
// ---------------------------------------------------------------------------

describe("createItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { id: "user-1" },
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
			user: { id: "user-1" },
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
			id: "new-item-id",
			householdId: "household-1",
			name: "Eggs",
			connectedStores: [],
		};
		(prisma.item.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			body: { name: "Eggs" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Item created!");
		expect(jsonArg.item._id).toBe("new-item-id");
		expect(jsonArg.item.connectedStores).toEqual([]);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

describe("updateItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

	it("calls next with 404 when item is not found", async () => {
		(prisma.item.findFirst as any).mockResolvedValue(null);

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
		const existingDoc = {
			id: "item-1",
			householdId: "household-1",
			name: "Old Milk",
		};
		const updatedDoc = {
			id: "item-1",
			householdId: "household-1",
			name: "Updated Milk",
			connectedStores: [],
		};

		(prisma.item.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.item.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1", name: "Updated Milk" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Item updated successfully");
		expect(jsonArg.item._id).toBe("item-1");
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------

describe("deleteItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

	it("calls next with 404 when item is not found", async () => {
		(prisma.item.findFirst as any).mockResolvedValue(null);

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
		const existingDoc = {
			id: "item-1",
			householdId: "household-1",
			name: "Milk",
		};
		(prisma.item.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.item.delete as any).mockResolvedValue(existingDoc);

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
	});

	it("calls next with 400 when itemId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1", storeItemId: "SKU-001", storeItemName: "Milk" },
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
			body: { itemId: "item-1", storeItemId: "SKU-001", storeItemName: "Milk" },
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
			body: { itemId: "item-1", storeId: "store-1", storeItemName: "Milk" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addConnectedStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when store is not found", async () => {
		(prisma.store.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1", storeId: "nonexistent-store", storeItemId: "SKU-001", storeItemName: "Generic Milk" },
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

	it("calls next with 404 when item is not found", async () => {
		const mockStore = { id: "store-1", householdId: "household-1", name: "Walmart" };
		(prisma.store.findFirst as any).mockResolvedValue(mockStore);
		(prisma.item.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "nonexistent-item", storeId: "store-1", storeItemId: "SKU-001", storeItemName: "Generic Milk" },
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
		const mockStore = { id: "store-1", householdId: "household-1", name: "Walmart" };
		const mockFoundItem = { id: "item-1", householdId: "household-1", name: "Milk" };
		const updatedDoc = {
			id: "item-1",
			householdId: "household-1",
			name: "Milk",
			connectedStores: [
				{ storeId: "store-1", storeName: "Walmart", storeItemId: "SKU-001", storeItemName: "Generic Milk" },
			],
		};

		(prisma.store.findFirst as any).mockResolvedValue(mockStore);
		(prisma.item.findFirst as any).mockResolvedValue(mockFoundItem);
		(prisma.item.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "household-1",
			body: { itemId: "item-1", storeId: "store-1", storeItemId: "SKU-001", storeItemName: "Generic Milk" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addConnectedStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Store added to item");
		expect(jsonArg.item._id).toBe("item-1");
		expect(jsonArg.item.connectedStores).toHaveLength(1);
		expect(next).not.toHaveBeenCalled();
	});
});
