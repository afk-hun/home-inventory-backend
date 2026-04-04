import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { mealTypes } from "../db/schema";

export const getMealTypes = (
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
		const result = db.query.mealTypes.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
		}).sync();
		res.status(200).json({
			mealTypes: result.map((mt) => ({
				_id: mt.id,
				name: mt.name,
				householdId: mt.householdId,
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createMealType = (
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
		db.insert(mealTypes).values({ id, name, householdId }).run();
		res.status(201).json({
			message: "Meal type created!",
			mealType: { _id: id, name, householdId },
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const renameMealType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const mealTypeId = req.body.mealTypeId;
	const newName = req.body.name;

	if (!householdId || !mealTypeId || !newName) {
		const error = new Error(
			"Household ID, meal type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const mealType = db.query.mealTypes.findFirst({ where: (t, { eq }) => eq(t.id, mealTypeId) }).sync();
		if (!mealType) {
			const error = new Error("Meal type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.update(mealTypes).set({ name: newName }).where(eq(mealTypes.id, mealTypeId)).run();
		res.status(200).json({
			message: "Meal type renamed successfully",
			mealTypeId,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteMealType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const mealTypeId = req.body.mealTypeId;

	if (!mealTypeId) {
		const error = new Error("Meal type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const mealType = db.query.mealTypes.findFirst({ where: (t, { eq }) => eq(t.id, mealTypeId) }).sync();
		if (!mealType) {
			const error = new Error("Meal type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(mealTypes).where(eq(mealTypes.id, mealTypeId)).run();
		res.status(200).json({ message: "Meal type deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
