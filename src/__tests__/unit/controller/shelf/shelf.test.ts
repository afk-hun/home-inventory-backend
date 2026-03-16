import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the Shelf model before importing the controller
// ---------------------------------------------------------------------------
vi.mock("../../../../models/shelf", () => {
	const mockShelf: any = {
		countDocuments: vi.fn(),
		find: vi.fn(),
		findOne: vi.fn(),
		findOneAndDelete: vi.fn(),
	};
	// Constructor mock for createShelf
	const ShelfConstructor = vi.fn().mockImplementation(function (data: any) {
		Object.assign(this, data);
		this.save = vi.fn();
	});
	// Attach static methods to the constructor
	Object.assign(ShelfConstructor, mockShelf);
	return { default: ShelfConstructor };
});

import Shelf from "../../../../models/shelf";
import {
	getShelves,
	getShelf,
	createShelf,
	updateShelf,
	deleteShelf,
	addShelfItem,
	removeShelfItem,
} from "../../../../controller/shelf/shelf";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

beforeEach(() => {
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getShelves
// ---------------------------------------------------------------------------

describe("getShelves", () => {
	it("returns 404 when householdId is missing", () => {
		const req: any = { householdId: undefined, query: {} };
		const res = makeMockRes();
		const next = vi.fn();

		getShelves(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 200 with shelves and pagination on success", async () => {
		const fakeShelves = [{ _id: "s1", name: "Pantry" }];
		// countDocuments returns 1
		(Shelf.countDocuments as any).mockResolvedValue(1);
		// find().skip().limit() chain
		const mockSkip = vi.fn().mockReturnThis();
		const mockLimit = vi.fn().mockResolvedValue(fakeShelves);
		(Shelf.find as any).mockReturnValue({ skip: mockSkip, limit: mockLimit });

		const req: any = { householdId: "h1", query: { page: "1", limit: "5" } };
		const res = makeMockRes();
		const next = vi.fn();

		getShelves(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			shelves: fakeShelves,
			pagination: {
				total: 1,
				page: 1,
				limit: 5,
				totalPages: 1,
			},
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// getShelf
// ---------------------------------------------------------------------------

describe("getShelf", () => {
	it("returns 404 when householdId is missing", () => {
		const req: any = { householdId: undefined, params: { id: "s1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getShelf(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 404 when shelf is not found", async () => {
		// findOne().populate().populate() chain returns null
		const mockPopulate1 = vi.fn().mockReturnThis();
		const mockPopulate2 = vi.fn().mockResolvedValue(null);
		(Shelf.findOne as any).mockReturnValue({
			populate: mockPopulate1,
		});
		mockPopulate1.mockReturnValueOnce({ populate: mockPopulate2 });

		const req: any = { householdId: "h1", params: { id: "nonexistent" } };
		const res = makeMockRes();
		const next = vi.fn();

		getShelf(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 with shelf on success", async () => {
		const fakeShelf = { _id: "s1", name: "Pantry", items: [] };
		const mockPopulate2 = vi.fn().mockResolvedValue(fakeShelf);
		const mockPopulate1 = vi.fn().mockReturnValue({ populate: mockPopulate2 });
		(Shelf.findOne as any).mockReturnValue({ populate: mockPopulate1 });

		const req: any = { householdId: "h1", params: { id: "s1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getShelf(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({ shelf: fakeShelf });
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createShelf
// ---------------------------------------------------------------------------

describe("createShelf", () => {
	it("returns 404 when householdId is missing", () => {
		const req: any = { householdId: undefined, body: { name: "Kitchen" } };
		const res = makeMockRes();
		const next = vi.fn();

		createShelf(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 400 when name is missing", () => {
		const req: any = { householdId: "h1", body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		createShelf(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 201 with message and shelf on success", async () => {
		const savedShelf = { _id: "s1", name: "Kitchen", householdId: "h1" };
		// The constructor mock's save() should resolve with savedShelf
		(Shelf as any).mockImplementation(function (data: any) {
			Object.assign(this, data);
			this.save = vi.fn().mockResolvedValue(savedShelf);
		});

		const req: any = {
			householdId: "h1",
			body: { name: "Kitchen", place: "Ground Floor", type: "Dry goods" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShelf(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shelf created!",
			shelf: savedShelf,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateShelf
// ---------------------------------------------------------------------------

describe("updateShelf", () => {
	it("returns 404 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { shelfId: "s1", name: "New" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShelf(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 400 when shelfId is missing", () => {
		const req: any = { householdId: "h1", body: { name: "New" } };
		const res = makeMockRes();
		const next = vi.fn();

		updateShelf(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when shelf is not found", async () => {
		(Shelf.findOne as any).mockResolvedValue(null);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "nonexistent", name: "Ghost" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShelf(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 with updated shelf on success", async () => {
		const updatedShelf = { _id: "s1", name: "Updated", householdId: "h1" };
		const mockShelfDoc: any = {
			_id: "s1",
			name: "Old",
			save: vi.fn().mockResolvedValue(updatedShelf),
		};
		(Shelf.findOne as any).mockResolvedValue(mockShelfDoc);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShelf(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Shelf updated successfully",
				shelf: updatedShelf,
			}),
		);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteShelf
// ---------------------------------------------------------------------------

describe("deleteShelf", () => {
	it("returns 404 when householdId is missing", () => {
		const req: any = { householdId: undefined, body: { shelfId: "s1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelf(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 400 when shelfId is missing", () => {
		const req: any = { householdId: "h1", body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelf(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when shelf is not found", async () => {
		(Shelf.findOneAndDelete as any).mockResolvedValue(null);

		const req: any = { householdId: "h1", body: { shelfId: "nonexistent" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelf(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 on successful deletion", async () => {
		(Shelf.findOneAndDelete as any).mockResolvedValue({ _id: "s1" });

		const req: any = { householdId: "h1", body: { shelfId: "s1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelf(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Shelf deleted successfully" }),
		);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// addShelfItem
// ---------------------------------------------------------------------------

describe("addShelfItem", () => {
	it("returns 404 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { shelfId: "s1", itemId: "i1", quantity: 2 },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addShelfItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 400 when shelfId is missing", () => {
		const req: any = {
			householdId: "h1",
			body: { itemId: "i1", quantity: 2 },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addShelfItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when both itemId and itemName are missing", () => {
		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", quantity: 2 },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addShelfItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when quantity is missing", () => {
		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", itemId: "i1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addShelfItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when shelf is not found", async () => {
		(Shelf.findOne as any).mockResolvedValue(null);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "nonexistent", itemId: "i1", quantity: 1 },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addShelfItem(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 with message and updated shelf on success", async () => {
		const updatedShelf = {
			_id: "s1",
			name: "Pantry",
			items: [{ item: "i1", quantity: 3 }],
		};
		const mockItems: any[] = [];
		const mockShelfDoc: any = {
			_id: "s1",
			items: mockItems,
			save: vi.fn().mockResolvedValue(updatedShelf),
		};
		(Shelf.findOne as any).mockResolvedValue(mockShelfDoc);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", itemId: "i1", quantity: 3 },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addShelfItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Item added to shelf",
			shelf: updatedShelf,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// removeShelfItem
// ---------------------------------------------------------------------------

describe("removeShelfItem", () => {
	it("returns 404 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { shelfId: "s1", shelfItemId: "si1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		removeShelfItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 400 when shelfId is missing", () => {
		const req: any = {
			householdId: "h1",
			body: { shelfItemId: "si1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		removeShelfItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when shelfItemId is missing", () => {
		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		removeShelfItem(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when shelf is not found", async () => {
		(Shelf.findOne as any).mockResolvedValue(null);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "nonexistent", shelfItemId: "si1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		removeShelfItem(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 404 when shelf item is not found within shelf", async () => {
		const mockShelfDoc: any = {
			_id: "s1",
			items: [
				{
					_id: { toString: () => "si-other" },
					item: "i1",
					quantity: 1,
				},
			],
			save: vi.fn(),
		};
		(Shelf.findOne as any).mockResolvedValue(mockShelfDoc);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", shelfItemId: "si-nonexistent" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		removeShelfItem(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 on successful removal", async () => {
		const shelfItemId = "si1";
		const updatedShelf = { _id: "s1", items: [] };
		const mockItems = [
			{
				_id: { toString: () => shelfItemId },
				item: "i1",
				quantity: 1,
			},
		];
		const mockShelfDoc: any = {
			_id: "s1",
			items: mockItems,
			save: vi.fn().mockResolvedValue(updatedShelf),
		};
		(Shelf.findOne as any).mockResolvedValue(mockShelfDoc);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", shelfItemId },
		};
		const res = makeMockRes();
		const next = vi.fn();

		removeShelfItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Item removed from shelf" }),
		);
		expect(next).not.toHaveBeenCalled();
	});
});
