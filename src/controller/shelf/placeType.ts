import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../lib/db";
import { shelfPlaceTypes } from "../../db/schema";

export const getShelfPlaceTypes = (
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
		const result = db.query.shelfPlaceTypes.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
		}).sync();
		res.status(200).json({
			shelfPlaces: result.map((sp) => ({
				_id: sp.id,
				name: sp.name,
				householdId: sp.householdId,
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createShelfPlaceType = (
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
		db.insert(shelfPlaceTypes).values({ id, name, householdId }).run();
		res.status(201).json({
			message: "Shelf place type created!",
			shelfPlaceType: { _id: id, name, householdId },
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const renameShelfPlaceType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const shelfPlaceTypeId = req.body.shelfPlaceTypeId;
	const newName = req.body.name;

	if (!householdId || !newName || !shelfPlaceTypeId) {
		const error = new Error("Household ID, shelf place type ID, and new name are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const shelfPlaceType = db.query.shelfPlaceTypes.findFirst({ where: (t, { eq }) => eq(t.id, shelfPlaceTypeId) }).sync();
		if (!shelfPlaceType) {
			const error = new Error("Shelf place type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.update(shelfPlaceTypes).set({ name: newName }).where(eq(shelfPlaceTypes.id, shelfPlaceTypeId)).run();
		res.status(200).json({
			message: "Shelf place type renamed successfully",
			shelfPlaceTypeId,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteShelfPlaceType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const shelfPlaceTypeId = req.body.shelfPlaceTypeId;

	if (!shelfPlaceTypeId) {
		const error = new Error("Household ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const shelfPlaceType = db.query.shelfPlaceTypes.findFirst({ where: (t, { eq }) => eq(t.id, shelfPlaceTypeId) }).sync();
		if (!shelfPlaceType) {
			const error = new Error("Shelf place type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(shelfPlaceTypes).where(eq(shelfPlaceTypes.id, shelfPlaceTypeId)).run();
		res.status(200).json({ message: "Shelf place type deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
