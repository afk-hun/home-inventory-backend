import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";

export const getRecipes = (
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

	prisma.recipe
		.findMany({ where: { householdId }, include: { ingredients: true } })
		.then((recipes) => {
			res.status(200).json({
				recipes: recipes.map((recipe) => ({
					_id: recipe.id,
					householdId: recipe.householdId,
					name: recipe.name,
					type: recipe.type,
					ingredients: recipe.ingredients.map((ing) => ({
						_id: ing.id,
						quantity: ing.quantity,
						unit: ing.unit,
						item: ing.itemId,
					})),
					portion: recipe.portion,
					description: recipe.description,
				})),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const recipeId = req.params.id;

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

	prisma.recipe
		.findUnique({ where: { id: recipeId }, include: { ingredients: true } })
		.then((recipe) => {
			if (!recipe) {
				const error = new Error("Recipe not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				recipe: {
					_id: recipe.id,
					householdId: recipe.householdId,
					name: recipe.name,
					type: recipe.type,
					ingredients: recipe.ingredients.map((ing) => ({
						_id: ing.id,
						quantity: ing.quantity,
						unit: ing.unit,
						item: ing.itemId,
					})),
					portion: recipe.portion,
					description: recipe.description,
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const name = req.body.name;
	const type = req.body.type;
	const ingredients = req.body.ingredients;
	const portion = req.body.portion;
	const description = req.body.description;

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

	if (!name) {
		const error = new Error("Name is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const ingList: any[] = ingredients || [];

	prisma.recipe
		.create({
			data: {
				householdId,
				name,
				type,
				portion,
				description,
				ingredients: {
					create: ingList.map((ing: any) => ({
						itemId: ing.item,
						quantity: ing.quantity,
						unit: ing.unit,
					})),
				},
			},
			include: { ingredients: true },
		})
		.then((result) => {
			res.status(201).json({
				message: "Recipe created!",
				recipe: {
					...toMongoDoc(result),
					ingredients: result.ingredients.map((ing) => ({
						_id: ing.id,
						quantity: ing.quantity,
						unit: ing.unit,
						item: ing.itemId,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const recipeId = req.body.recipeId;
	const name = req.body.name;
	const type = req.body.type;
	const ingredients = req.body.ingredients;
	const portion = req.body.portion;
	const description = req.body.description;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!recipeId) {
		const error = new Error("Recipe ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.recipe
		.findUnique({ where: { id: recipeId } })
		.then((recipe) => {
			if (!recipe) {
				const error = new Error("Recipe not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const updateData: any = {};
			if (name !== undefined) updateData.name = name;
			if (type !== undefined) updateData.type = type;
			if (portion !== undefined) updateData.portion = portion;
			if (description !== undefined) updateData.description = description;

			if (ingredients !== undefined) {
				return prisma.$transaction([
					prisma.ingredient.deleteMany({ where: { recipeId } }),
					prisma.recipe.update({
						where: { id: recipeId },
						data: {
							...updateData,
							ingredients: {
								create: (ingredients as any[]).map((ing: any) => ({
									itemId: ing.item,
									quantity: ing.quantity,
									unit: ing.unit,
								})),
							},
						},
						include: { ingredients: true },
					}),
				]).then(([, updated]) => updated);
			}

			return prisma.recipe.update({
				where: { id: recipeId },
				data: updateData,
				include: { ingredients: true },
			});
		})
		.then((updated: any) => {
			res.status(200).json({
				message: "Recipe updated successfully",
				recipe: {
					...toMongoDoc(updated),
					ingredients: updated.ingredients.map((ing: any) => ({
						_id: ing.id,
						quantity: ing.quantity,
						unit: ing.unit,
						item: ing.itemId,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getMissingIngredients = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const recipeId = req.params.id;

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

	let foundRecipe: any;

	prisma.recipe
		.findUnique({
			where: { id: recipeId },
			include: {
				ingredients: {
					include: { item: { select: { id: true, name: true } } },
				},
			},
		})
		.then((recipe) => {
			if (!recipe) {
				const error = new Error("Recipe not found") as any;
				error.statusCode = 404;
				throw error;
			}
			foundRecipe = recipe;
			return prisma.shelfItem.findMany({
				where: { shelf: { householdId } },
			});
		})
		.then((shelfItems) => {
			// Build a map: itemId -> { [unit_lower]: totalQuantity }
			const shelfTotals = new Map<string, Map<string, number>>();

			for (const si of shelfItems) {
				const itemId = si.itemId;
				const unit = (si.unit || "").toLowerCase();
				if (!shelfTotals.has(itemId)) {
					shelfTotals.set(itemId, new Map());
				}
				const unitMap = shelfTotals.get(itemId)!;
				unitMap.set(unit, (unitMap.get(unit) || 0) + si.quantity);
			}

			const missing: { item: { _id: string; name: any }; amount: number; unit: string }[] = [];

			for (const ingredient of foundRecipe.ingredients) {
				const itemId = ingredient.item.id;
				const requiredUnit = ingredient.unit.toLowerCase();
				const requiredAmount = ingredient.quantity;

				const unitMap = shelfTotals.get(itemId);
				const shelfAmount = unitMap ? (unitMap.get(requiredUnit) || 0) : 0;

				if (shelfAmount < requiredAmount) {
					missing.push({
						item: { _id: ingredient.item.id, name: ingredient.item.name },
						amount: requiredAmount,
						unit: ingredient.unit,
					});
				}
			}

			res.status(200).json(missing);
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const recipeId = req.body.recipeId;

	if (!recipeId) {
		const error = new Error("Recipe ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.recipe
		.findUnique({ where: { id: recipeId } })
		.then((recipe) => {
			if (!recipe) {
				const error = new Error("Recipe not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.recipe.delete({ where: { id: recipeId } });
		})
		.then(() => {
			res.status(200).json({
				message: "Recipe deleted successfully",
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
