import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		shoppingList: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		shoppingListItem: {
			deleteMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}));

import { prisma } from "../../../lib/prisma";
import {
	getShoppingLists,
	getShoppingList,
	createShoppingList,
	updateShoppingList,
	deleteShoppingList,
} from "../../../controller/shoppingList";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

const makeItem = (overrides: any = {}) => ({
	id: "item-1",
	itemName: "Milk",
	quantity: 2,
	unit: "liter",
	checked: false,
	shoppingListId: "list-1",
	...overrides,
});

// ---------------------------------------------------------------------------
// getShoppingLists
// ---------------------------------------------------------------------------

describe("getShoppingLists", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = { householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getShoppingLists(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with shoppingLists array on success", async () => {
		const item = makeItem();
		const mockDocs = [
			{
				id: "list-1",
				name: "Weekly Shop",
				storeId: "store-1",
				householdId: "household-1",
				items: [item],
			},
		];
		(prisma.shoppingList.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { householdId: "household-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getShoppingLists(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.shoppingLists[0]._id).toBe("list-1");
		expect(jsonArg.shoppingLists[0].items[0]._id).toBe("item-1");
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// getShoppingList
// ---------------------------------------------------------------------------

describe("getShoppingList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = { householdId: undefined, params: { shoppingListId: "list-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when shoppingListId param is missing", () => {
		const req: any = { householdId: "household-1", params: {} };
		const res = makeMockRes();
		const next = vi.fn();

		getShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when list is not found", async () => {
		(prisma.shoppingList.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			params: { shoppingListId: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getShoppingList(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with shoppingList on success", async () => {
		const item = makeItem({ id: "item-2", itemName: "Eggs", quantity: 6, unit: "pcs", checked: true });
		const mockDoc = {
			id: "list-1",
			name: "Weekend Groceries",
			storeId: "store-1",
			householdId: "household-1",
			items: [item],
		};
		(prisma.shoppingList.findFirst as any).mockResolvedValue(mockDoc);

		const req: any = {
			householdId: "household-1",
			params: { shoppingListId: "list-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.shoppingList._id).toBe("list-1");
		expect(jsonArg.shoppingList.items[0]._id).toBe("item-2");
		expect(jsonArg.shoppingList.items[0].checked).toBe(true);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createShoppingList
// ---------------------------------------------------------------------------

describe("createShoppingList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { name: "My List", storeId: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when storeId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { name: "My List" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with shoppingList on success", async () => {
		const savedDoc = {
			id: "new-list-id",
			householdId: "household-1",
			name: "My List",
			storeId: "store-1",
			items: [],
		};
		(prisma.shoppingList.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			householdId: "household-1",
			body: { name: "My List", storeId: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Shopping list created!");
		expect(jsonArg.shoppingList._id).toBe("new-list-id");
		expect(jsonArg.shoppingList.items).toEqual([]);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 201 with items including checked field when provided", async () => {
		const items = [{ id: "si-1", itemName: "Milk", quantity: 2, unit: "liter", checked: false, shoppingListId: "new-list-id" }];
		const savedDoc = {
			id: "new-list-id",
			householdId: "household-1",
			name: "My List",
			storeId: "store-1",
			items,
		};
		(prisma.shoppingList.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			householdId: "household-1",
			body: { name: "My List", storeId: "store-1", items: [{ itemName: "Milk", quantity: 2, unit: "liter", checked: false }] },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json.mock.calls[0][0].shoppingList.items[0].checked).toBe(false);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateShoppingList
// ---------------------------------------------------------------------------

describe("updateShoppingList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { shoppingListId: "list-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when shoppingListId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: { name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when list is not found", async () => {
		(prisma.shoppingList.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { shoppingListId: "nonexistent-id", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShoppingList(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated shoppingList on success", async () => {
		const existingDoc = {
			id: "list-1",
			name: "Old Name",
			storeId: "store-1",
			householdId: "household-1",
		};
		const updatedDoc = {
			id: "list-1",
			name: "Updated List",
			storeId: "store-1",
			householdId: "household-1",
			items: [],
		};

		(prisma.shoppingList.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.shoppingList.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "household-1",
			body: { shoppingListId: "list-1", name: "Updated List" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Shopping list updated successfully");
		expect(jsonArg.shoppingList._id).toBe("list-1");
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 200 and preserves checked field when updating items via $transaction", async () => {
		const newItems = [
			{ id: "si-1", itemName: "Bread", quantity: 1, unit: "pcs", checked: true, shoppingListId: "list-1" },
			{ id: "si-2", itemName: "Butter", quantity: 200, unit: "g", checked: false, shoppingListId: "list-1" },
		];
		const existingDoc = {
			id: "list-1",
			name: "Test List",
			storeId: "store-1",
			householdId: "household-1",
		};
		const updatedDoc = {
			id: "list-1",
			name: "Test List",
			storeId: "store-1",
			householdId: "household-1",
			items: newItems,
		};

		(prisma.shoppingList.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.$transaction as any).mockResolvedValue([{}, updatedDoc]);

		const req: any = {
			householdId: "household-1",
			body: { shoppingListId: "list-1", items: [{ itemName: "Bread", quantity: 1, unit: "pcs", checked: true }, { itemName: "Butter", quantity: 200, unit: "g", checked: false }] },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json.mock.calls[0][0].shoppingList.items[0].checked).toBe(true);
		expect(res.json.mock.calls[0][0].shoppingList.items[1].checked).toBe(false);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteShoppingList
// ---------------------------------------------------------------------------

describe("deleteShoppingList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { shoppingListId: "list-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when shoppingListId is missing", () => {
		const req: any = {
			householdId: "household-1",
			body: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteShoppingList(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when list is not found", async () => {
		(prisma.shoppingList.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { shoppingListId: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteShoppingList(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = { id: "list-1", name: "Doomed List", storeId: "store-1", householdId: "household-1" };
		(prisma.shoppingList.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.shoppingList.delete as any).mockResolvedValue(existingDoc);

		const req: any = {
			householdId: "household-1",
			body: { shoppingListId: "list-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shopping list deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});
});
