import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";

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

	prisma.recipeType
		.findMany({ where: { householdId } })
		.then((recipeTypes) => {
			res.status(200).json({
				recipeTypes: recipeTypes.map((rt) => ({
					_id: rt.id,
					name: rt.name,
					householdId: rt.householdId,
				})),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.recipeType
		.create({ data: { name, householdId } })
		.then((result) => {
			res.status(201).json({
				message: "Recipe type created!",
				recipeType: toMongoDoc(result),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.recipeType
		.findUnique({ where: { id: recipeTypeId } })
		.then((recipeType) => {
			if (!recipeType) {
				const error = new Error("Recipe type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.recipeType.update({
				where: { id: recipeTypeId },
				data: { name: newName },
			});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Recipe type renamed successfully",
				recipeTypeId: updated.id,
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.recipeType
		.findUnique({ where: { id: recipeTypeId } })
		.then((recipeType) => {
			if (!recipeType) {
				const error = new Error("Recipe type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.recipeType.delete({ where: { id: recipeTypeId } });
		})
		.then(() => {
			res.status(200).json({
				message: "Recipe type deleted successfully",
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
