import { describe, it, expect, vi, beforeEach } from "vitest";

let mockSave = vi.fn();

vi.mock("../../../models/shoppingList", () => {
	const find = vi.fn();
	const findOne = vi.fn();
	const findOneAndDelete = vi.fn();

	const MockShoppingList = vi.fn(function MockShoppingListImpl(
		this: any,
		data: any,
	) {
		Object.assign(this, data);
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockShoppingList as any).find = find;
	(MockShoppingList as any).findOne = findOne;
	(MockShoppingList as any).findOneAndDelete = findOneAndDelete;

	return { default: MockShoppingList };
});

import ShoppingList from "../../../models/shoppingList";
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

// ---------------------------------------------------------------------------
// getShoppingLists
// ---------------------------------------------------------------------------

describe("getShoppingLists", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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
		const mockDocs = [
			{ _id: "list-1", name: "Weekly Shop", storeId: "store-1", items: [] },
		];
		(ShoppingList.find as any).mockResolvedValue(mockDocs);

		const req: any = { householdId: "household-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getShoppingLists(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({ shoppingLists: mockDocs });
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// getShoppingList
// ---------------------------------------------------------------------------

describe("getShoppingList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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

	it("calls next with 404 when ShoppingList.findOne returns null", async () => {
		(ShoppingList.findOne as any).mockResolvedValue(null);

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
		const mockDoc = { _id: "list-1", name: "Weekend Groceries", storeId: "store-1", items: [] };
		(ShoppingList.findOne as any).mockResolvedValue(mockDoc);

		const req: any = {
			householdId: "household-1",
			params: { shoppingListId: "list-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({ shoppingList: mockDoc });
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createShoppingList
// ---------------------------------------------------------------------------

describe("createShoppingList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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
			_id: "new-list-id",
			householdId: "household-1",
			name: "My List",
			storeId: "store-1",
			items: [],
		};
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			householdId: "household-1",
			body: { name: "My List", storeId: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shopping list created!",
			shoppingList: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 201 with items when provided", async () => {
		const items = [{ itemName: "Milk", quantity: 2, unit: "liter" }];
		const savedDoc = {
			_id: "new-list-id",
			householdId: "household-1",
			name: "My List",
			storeId: "store-1",
			items,
		};
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			householdId: "household-1",
			body: { name: "My List", storeId: "store-1", items },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shopping list created!",
			shoppingList: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateShoppingList
// ---------------------------------------------------------------------------

describe("updateShoppingList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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

	it("calls next with 404 when ShoppingList.findOne returns null", async () => {
		(ShoppingList.findOne as any).mockResolvedValue(null);

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
		const updatedDoc = {
			_id: "list-1",
			name: "Updated List",
			storeId: "store-1",
			items: [],
		};
		const mockFoundDoc: any = {
			_id: "list-1",
			name: "Old Name",
			storeId: "store-1",
			items: [],
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(ShoppingList.findOne as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "household-1",
			body: { shoppingListId: "list-1", name: "Updated List" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShoppingList(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shopping list updated successfully",
			shoppingList: updatedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteShoppingList
// ---------------------------------------------------------------------------

describe("deleteShoppingList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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

	it("calls next with 404 when ShoppingList.findOneAndDelete returns null", async () => {
		(ShoppingList.findOneAndDelete as any).mockResolvedValue(null);

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
		const deletedDoc = { _id: "list-1", name: "Doomed List", storeId: "store-1", items: [] };
		(ShoppingList.findOneAndDelete as any).mockResolvedValue(deletedDoc);

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
