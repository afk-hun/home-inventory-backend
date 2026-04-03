import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../lib/prisma", () => ({
	prisma: {
		shelf: {
			count: vi.fn(),
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		shelfItem: {
			findFirst: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

import { prisma } from "../../../../lib/prisma";
import {
	getShelves,
	getShelf,
	createShelf,
	updateShelf,
	deleteShelf,
	addShelfItem,
	removeShelfItem,
} from "../../../../controller/shelf/shelf";

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
		const fakeShelves = [{ id: "s1", name: "Pantry", householdId: "h1" }];
		(prisma.shelf.count as any).mockResolvedValue(1);
		(prisma.shelf.findMany as any).mockResolvedValue(fakeShelves);

		const req: any = { householdId: "h1", query: { page: "1", limit: "5" } };
		const res = makeMockRes();
		const next = vi.fn();

		getShelves(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.shelves[0]._id).toBe("s1");
		expect(jsonArg.pagination).toMatchObject({
			total: 1,
			page: 1,
			limit: 5,
			totalPages: 1,
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
		(prisma.shelf.findFirst as any).mockResolvedValue(null);

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
		const fakeShelf = {
			id: "s1",
			name: "Pantry",
			householdId: "h1",
			items: [
				{
					id: "si1",
					shelfId: "s1",
					itemId: "i1",
					itemName: "Rice",
					quantity: 2,
					unit: "kg",
					item: { id: "i1", name: "Rice" },
				},
			],
		};
		(prisma.shelf.findFirst as any).mockResolvedValue(fakeShelf);

		const req: any = { householdId: "h1", params: { id: "s1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getShelf(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.shelf._id).toBe("s1");
		expect(jsonArg.shelf.items[0]._id).toBe("si1");
		expect(jsonArg.shelf.items[0].item._id).toBe("i1");
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
		const savedShelf = { id: "s1", name: "Kitchen", householdId: "h1" };
		(prisma.shelf.create as any).mockResolvedValue(savedShelf);

		const req: any = {
			householdId: "h1",
			body: { name: "Kitchen", place: "Ground Floor", type: "Dry goods" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShelf(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Shelf created!");
		expect(jsonArg.shelf._id).toBe("s1");
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
		(prisma.shelf.findFirst as any).mockResolvedValue(null);

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
		const existingShelf = { id: "s1", name: "Old", householdId: "h1" };
		const updatedShelf = { id: "s1", name: "Updated", householdId: "h1" };

		(prisma.shelf.findFirst as any).mockResolvedValue(existingShelf);
		(prisma.shelf.update as any).mockResolvedValue(updatedShelf);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateShelf(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Shelf updated successfully");
		expect(jsonArg.shelf._id).toBe("s1");
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
		(prisma.shelf.findFirst as any).mockResolvedValue(null);

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
		const existingShelf = { id: "s1", name: "Pantry", householdId: "h1" };
		(prisma.shelf.findFirst as any).mockResolvedValue(existingShelf);
		(prisma.shelf.delete as any).mockResolvedValue(existingShelf);

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
		(prisma.shelf.findFirst as any).mockResolvedValue(null);

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
		const existingShelf = { id: "s1", name: "Pantry", householdId: "h1" };
		const updatedShelf = {
			id: "s1",
			name: "Pantry",
			householdId: "h1",
			items: [
				{ id: "si1", shelfId: "s1", itemId: "i1", itemName: null, quantity: 3, unit: null, item: { id: "i1", name: "Oats" } },
			],
		};

		(prisma.shelf.findFirst as any)
			.mockResolvedValueOnce(existingShelf)
			.mockResolvedValueOnce(updatedShelf);
		(prisma.shelfItem.create as any).mockResolvedValue({});

		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", itemId: "i1", quantity: 3 },
		};
		const res = makeMockRes();
		const next = vi.fn();

		addShelfItem(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Item added to shelf");
		expect(jsonArg.shelf._id).toBe("s1");
		expect(jsonArg.shelf.items[0]._id).toBe("si1");
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
		(prisma.shelf.findFirst as any).mockResolvedValue(null);

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
		const existingShelf = { id: "s1", name: "Pantry", householdId: "h1" };
		(prisma.shelf.findFirst as any).mockResolvedValue(existingShelf);
		(prisma.shelfItem.findFirst as any).mockResolvedValue(null);

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
		const existingShelf = { id: "s1", name: "Pantry", householdId: "h1" };
		const existingShelfItem = { id: "si1", shelfId: "s1", itemId: "i1", quantity: 1, unit: null };
		const updatedShelf = {
			id: "s1",
			name: "Pantry",
			householdId: "h1",
			items: [],
		};

		(prisma.shelf.findFirst as any)
			.mockResolvedValueOnce(existingShelf)
			.mockResolvedValueOnce(updatedShelf);
		(prisma.shelfItem.findFirst as any).mockResolvedValue(existingShelfItem);
		(prisma.shelfItem.delete as any).mockResolvedValue(existingShelfItem);

		const req: any = {
			householdId: "h1",
			body: { shelfId: "s1", shelfItemId: "si1" },
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
