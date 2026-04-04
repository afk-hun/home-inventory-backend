import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { recipeTypes } from "../db/schema";

export const getRecipeTypes = (
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
		const result = db.query.recipeTypes.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
		}).sync();
		res.status(200).json({
			recipeTypes: result.map((rt) => ({
				_id: rt.id,
				name: rt.name,
				householdId: rt.householdId,
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createRecipeType = (
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
		db.insert(recipeTypes).values({ id, name, householdId }).run();
		res.status(201).json({
			message: "Recipe type created!",
			recipeType: { _id: id, name, householdId },
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const renameRecipeType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const recipeTypeId = req.body.recipeTypeId;
	const newName = req.body.name;

	if (!householdId || !recipeTypeId || !newName) {
		const error = new Error(
			"Household ID, recipe type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const recipeType = db.query.recipeTypes.findFirst({ where: (t, { eq }) => eq(t.id, recipeTypeId) }).sync();
		if (!recipeType) {
			const error = new Error("Recipe type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.update(recipeTypes).set({ name: newName }).where(eq(recipeTypes.id, recipeTypeId)).run();
		res.status(200).json({
			message: "Recipe type renamed successfully",
			recipeTypeId,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteRecipeType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const recipeTypeId = req.body.recipeTypeId;

	if (!recipeTypeId) {
		const error = new Error("Recipe type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const recipeType = db.query.recipeTypes.findFirst({ where: (t, { eq }) => eq(t.id, recipeTypeId) }).sync();
		if (!recipeType) {
			const error = new Error("Recipe type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(recipeTypes).where(eq(recipeTypes.id, recipeTypeId)).run();
		res.status(200).json({ message: "Recipe type deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
