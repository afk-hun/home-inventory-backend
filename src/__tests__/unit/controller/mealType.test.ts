import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level save mock — tests can replace the resolved value per-test
let mockSave = vi.fn();

vi.mock("../../../models/mealType", () => {
	const find = vi.fn();
	const findById = vi.fn();
	const findByIdAndDelete = vi.fn();

	// Must be a regular function (not arrow) so `new MealType(...)` works.
	const MockMealType = vi.fn(function MockMealTypeImpl(this: any, data: any) {
		Object.assign(this, data);
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockMealType as any).find = find;
	(MockMealType as any).findById = findById;
	(MockMealType as any).findByIdAndDelete = findByIdAndDelete;

	return { default: MockMealType };
});

import MealType from "../../../models/mealType";
import {
	getMealTypes,
	createMealType,
	renameMealType,
	deleteMealType,
} from "../../../controller/mealTypeController";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getMealTypes
// ---------------------------------------------------------------------------

describe("getMealTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = { user: { _id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when MealType.find rejects", async () => {
		(MealType.find as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with mealTypes array on happy path", async () => {
		const mockDocs = [
			{ _id: "mt-1", name: "Breakfast", householdId: "hh-1" },
			{ _id: "mt-2", name: "Dinner", householdId: "hh-1" },
		];
		(MealType.find as any).mockResolvedValue(mockDocs);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			mealTypes: mockDocs.map((d) => ({
				_id: d._id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("MealType.find is called with the correct householdId", async () => {
		(MealType.find as any).mockResolvedValue([]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-42" };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(MealType.find).toHaveBeenCalledWith({ householdId: "hh-42" });
	});
});

// ---------------------------------------------------------------------------
// createMealType
// ---------------------------------------------------------------------------

describe("createMealType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			body: {},
			user: { _id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when owner (user) is missing", () => {
		const req: any = {
			body: { name: "Lunch" },
			user: undefined,
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when householdId is missing", () => {
		const req: any = {
			body: { name: "Lunch" },
			user: { _id: "user-1" },
			householdId: undefined,
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when save rejects", async () => {
		mockSave = vi.fn().mockRejectedValue(new Error("Save failed"));

		const req: any = {
			body: { name: "Lunch" },
			user: { _id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with mealType on happy path", async () => {
		const savedDoc = { _id: "mt-new", name: "Lunch", householdId: "hh-1" };
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Lunch" },
			user: { _id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Meal type created!",
			mealType: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// renameMealType
// ---------------------------------------------------------------------------

describe("renameMealType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { mealTypeId: "mt-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when mealTypeId is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "mt-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when findById returns null", async () => {
		(MealType.findById as any).mockResolvedValue(null);

		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "nonexistent-id", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findById rejects", async () => {
		(MealType.findById as any).mockRejectedValue(new Error("DB error"));

		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "mt-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with mealTypeId on happy path", async () => {
		const updatedDoc = { _id: "mt-1", name: "Renamed" };
		const mockFoundDoc: any = {
			_id: "mt-1",
			name: "Old Name",
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(MealType.findById as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "mt-1", name: "Renamed" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Meal type renamed successfully",
			mealTypeId: updatedDoc._id,
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("updates the name on the found document before saving", async () => {
		const mockFoundDoc: any = {
			_id: "mt-1",
			name: "Old Name",
			save: vi.fn().mockResolvedValue({ _id: "mt-1", name: "Renamed" }),
		};
		(MealType.findById as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "mt-1", name: "Renamed" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(mockFoundDoc.name).toBe("Renamed");
	});
});

// ---------------------------------------------------------------------------
// deleteMealType
// ---------------------------------------------------------------------------

describe("deleteMealType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when mealTypeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when findByIdAndDelete returns null", async () => {
		(MealType.findByIdAndDelete as any).mockResolvedValue(null);

		const req: any = { body: { mealTypeId: "nonexistent-id" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findByIdAndDelete rejects", async () => {
		(MealType.findByIdAndDelete as any).mockRejectedValue(new Error("DB down"));

		const req: any = { body: { mealTypeId: "mt-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const deletedDoc = { _id: "mt-1", name: "Breakfast", householdId: "hh-1" };
		(MealType.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = { body: { mealTypeId: "mt-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Meal type deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls findByIdAndDelete with the correct id", async () => {
		const deletedDoc = { _id: "mt-99", name: "Snack", householdId: "hh-1" };
		(MealType.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = { body: { mealTypeId: "mt-99" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(MealType.findByIdAndDelete).toHaveBeenCalledWith("mt-99");
	});
});
