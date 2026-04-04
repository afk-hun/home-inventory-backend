import { NextFunction, Request, Response } from "express";
import { eq, and, count } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../lib/db";
import { shelves, shelfItems } from "../../db/schema";
import { toMongoDoc } from "../../lib/serialize";
import { toBase } from "../../lib/units";

function shelfWithItems(id: string) {
	return db.query.shelves.findFirst({
		where: (t, { eq }) => eq(t.id, id),
		with: { items: { with: { item: { columns: { id: true, name: true } } } } },
	}).sync();
}

function mapShelfResponse(shelf: NonNullable<ReturnType<typeof shelfWithItems>>) {
	return {
		...toMongoDoc(shelf),
		items: shelf.items.map((si) => ({
			_id: si.id,
			item: { _id: si.item.id, name: si.item.name },
			itemName: si.itemName,
			quantity: si.quantity,
			unit: si.unit,
		})),
	};
}

export const getShelves = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const page = Math.max(1, parseInt(req.query.page as string) || 1);
	const limit = Math.max(1, parseInt(req.query.limit as string) || 5);
	const skip = (page - 1) * limit;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	try {
		const [{ total }] = db.select({ total: count() }).from(shelves).where(eq(shelves.householdId, householdId)).all();
		const result = db.query.shelves.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
			limit,
			offset: skip,
		}).sync();
		res.status(200).json({
			shelves: result.map(toMongoDoc),
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const getShelf = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const id = req.params.id as string;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	try {
		const shelf = db.query.shelves.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, id), eq(t.householdId, householdId)),
			with: { items: { with: { item: { columns: { id: true, name: true } } } } },
		}).sync();
		if (!shelf) {
			const error = new Error("Shelf not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		res.status(200).json({ shelf: mapShelfResponse(shelf) });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { name, place, type } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!name) {
		const error = new Error("Shelf name is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const id = createId();
		db.insert(shelves).values({
			id,
			householdId,
			name,
			...(place !== undefined && { place }),
			...(type !== undefined && { type }),
		}).run();
		const result = db.query.shelves.findFirst({ where: (t, { eq }) => eq(t.id, id) }).sync()!;
		res.status(201).json({ message: "Shelf created!", shelf: toMongoDoc(result) });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const updateShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, name, place, type } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId) {
		const error = new Error("Shelf ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const shelf = db.query.shelves.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, shelfId), eq(t.householdId, householdId)),
		}).sync();
		if (!shelf) {
			const error = new Error("Shelf not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (place !== undefined) updateData.place = place;
		if (type !== undefined) updateData.type = type;

		db.update(shelves).set(updateData).where(eq(shelves.id, shelfId)).run();
		const updated = db.query.shelves.findFirst({ where: (t, { eq }) => eq(t.id, shelfId) }).sync()!;
		res.status(200).json({
			message: "Shelf updated successfully",
			shelf: toMongoDoc(updated),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId) {
		const error = new Error("Shelf ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const shelf = db.query.shelves.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, shelfId), eq(t.householdId, householdId)),
		}).sync();
		if (!shelf) {
			const error = new Error("Shelf not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(shelves).where(eq(shelves.id, shelfId)).run();
		res.status(200).json({ message: "Shelf deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const addShelfItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, itemId, itemName, quantity, unit } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId || (!itemId && !itemName) || quantity === undefined) {
		const error = new Error(
			"Shelf ID, item ID or item name, and quantity are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const shelf = db.query.shelves.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, shelfId), eq(t.householdId, householdId)),
		}).sync();
		if (!shelf) {
			const error = new Error("Shelf not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const { baseQuantity, baseUnit } = unit !== undefined
			? toBase(quantity, unit)
			: { baseQuantity: null, baseUnit: null };

		db.insert(shelfItems).values({
			id: createId(),
			shelfId,
			itemId,
			quantity,
			...(itemName !== undefined && { itemName }),
			...(unit !== undefined && { unit }),
			...(baseQuantity !== null && { baseQuantity }),
			...(baseUnit !== null && { baseUnit }),
		}).run();

		const updated = shelfWithItems(shelfId)!;
		res.status(200).json({
			message: "Item added to shelf",
			shelf: mapShelfResponse(updated),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const removeShelfItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, shelfItemId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId || !shelfItemId) {
		const error = new Error("Shelf ID and shelf item ID are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const shelf = db.query.shelves.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, shelfId), eq(t.householdId, householdId)),
		}).sync();
		if (!shelf) {
			const error = new Error("Shelf not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const shelfItem = db.query.shelfItems.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, shelfItemId), eq(t.shelfId, shelfId)),
		}).sync();
		if (!shelfItem) {
			const error = new Error("Shelf item not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		db.delete(shelfItems).where(eq(shelfItems.id, shelfItemId)).run();
		const updated = shelfWithItems(shelfId)!;
		res.status(200).json({
			message: "Item removed from shelf",
			shelf: mapShelfResponse(updated),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
