import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../lib/db";
import { itemTypes } from "../../db/schema";

export const getItemTypes = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;

	if (!user) {
		const error = new Error("User not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	try {
		const result = db.query.itemTypes.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
		}).sync();
		res.status(200).json({
			itemTypes: result.map((it) => ({
				_id: it.id,
				name: it.name,
				householdId: it.householdId,
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createItemType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const name = req.body.name;
	const owner = req.user;
	const householdId = req.householdId;

	if (!name || !owner || !householdId) {
		const error = new Error(
			"Name, owner, and household ID are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const id = createId();
		db.insert(itemTypes).values({ id, householdId, name }).run();
		res.status(201).json({
			message: "Item type created!",
			itemType: { _id: id, name, householdId },
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const renameItemType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { itemTypeId, name } = req.body;

	if (!householdId || !itemTypeId || !name) {
		const error = new Error(
			"Household ID, item type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const itemType = db.query.itemTypes.findFirst({ where: (t, { eq }) => eq(t.id, itemTypeId) }).sync();
		if (!itemType) {
			const error = new Error("Item type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.update(itemTypes).set({ name }).where(eq(itemTypes.id, itemTypeId)).run();
		res.status(200).json({
			message: "Item type renamed successfully",
			itemTypeId,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteItemType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const { itemTypeId } = req.body;

	if (!itemTypeId) {
		const error = new Error("Item type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const itemType = db.query.itemTypes.findFirst({ where: (t, { eq }) => eq(t.id, itemTypeId) }).sync();
		if (!itemType) {
			const error = new Error("Item type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(itemTypes).where(eq(itemTypes.id, itemTypeId)).run();
		res.status(200).json({ message: "Item type deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
