import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../lib/db";
import { shelfTypes } from "../../db/schema";

export const getShelfTypes = (
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
		const result = db.query.shelfTypes.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
		}).sync();
		res.status(200).json({
			shelfTypes: result.map((st) => ({
				_id: st.id,
				name: st.name,
				householdId: st.householdId,
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createShelfType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const name = req.body.name;
	const owner = req.user;
	const householdId = req.householdId;

	if (!name || !owner || !householdId) {
		const error = new Error("Name, owner, and household ID are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const id = createId();
		db.insert(shelfTypes).values({ id, name, householdId }).run();
		res.status(201).json({
			message: "Shelf type created!",
			shelfType: { _id: id, name, householdId },
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const renameShelfType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const shelfTypeId = req.body.shelfTypeId;
	const newName = req.body.name;

	if (!householdId || !shelfTypeId || !newName) {
		const error = new Error(
			"Household ID, shelf type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const shelfType = db.query.shelfTypes.findFirst({ where: (t, { eq }) => eq(t.id, shelfTypeId) }).sync();
		if (!shelfType) {
			const error = new Error("Shelf type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.update(shelfTypes).set({ name: newName }).where(eq(shelfTypes.id, shelfTypeId)).run();
		res.status(200).json({
			message: "Shelf type renamed successfully",
			shelfTypeId,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteShelfType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const shelfTypeId = req.body.shelfTypeId;

	if (!shelfTypeId) {
		const error = new Error("Shelf type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const shelfType = db.query.shelfTypes.findFirst({ where: (t, { eq }) => eq(t.id, shelfTypeId) }).sync();
		if (!shelfType) {
			const error = new Error("Shelf type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(shelfTypes).where(eq(shelfTypes.id, shelfTypeId)).run();
		res.status(200).json({ message: "Shelf type deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
