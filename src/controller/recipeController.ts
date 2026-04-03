import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";
import { toBase } from "../lib/units";

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
					create: ingList.map((ing: any) => {
						const { baseQuantity, baseUnit } = toBase(ing.quantity, ing.unit);
						return {
							itemId: ing.item,
							quantity: ing.quantity,
							unit: ing.unit,
							...(baseQuantity !== null && { baseQuantity }),
							...(baseUnit !== null && { baseUnit }),
						};
					}),
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
								create: (ingredients as any[]).map((ing: any) => {
									const { baseQuantity, baseUnit } = toBase(ing.quantity, ing.unit);
									return {
										itemId: ing.item,
										quantity: ing.quantity,
										unit: ing.unit,
										...(baseQuantity !== null && { baseQuantity }),
										...(baseUnit !== null && { baseUnit }),
									};
								}),
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
			// Build two maps per itemId:
			//   baseMap: baseUnit -> total baseQuantity (for cross-unit comparison)
			//   exactMap: unit_lower -> total quantity (fallback for exact-unit match)
			const shelfBase = new Map<string, Map<string, number>>();
			const shelfExact = new Map<string, Map<string, number>>();

			for (const si of shelfItems) {
				const itemId = si.itemId;

				// Base-unit map
				if (si.baseUnit && si.baseQuantity !== null && si.baseQuantity !== undefined) {
					if (!shelfBase.has(itemId)) shelfBase.set(itemId, new Map());
					const bm = shelfBase.get(itemId)!;
					bm.set(si.baseUnit, (bm.get(si.baseUnit) || 0) + si.baseQuantity);
				}

				// Exact-unit map (fallback for old records without baseQuantity)
				const unit = (si.unit || "").toLowerCase();
				if (!shelfExact.has(itemId)) shelfExact.set(itemId, new Map());
				const em = shelfExact.get(itemId)!;
				em.set(unit, (em.get(unit) || 0) + si.quantity);
			}

			const missing: { item: { _id: string; name: any }; amount: number; unit: string }[] = [];

			for (const ingredient of foundRecipe.ingredients) {
				const itemId = ingredient.item.id;
				const requiredAmount = ingredient.quantity;

				// Prefer base-unit comparison when both sides have it
				if (
					ingredient.baseUnit &&
					ingredient.baseQuantity !== null &&
					ingredient.baseQuantity !== undefined
				) {
					const bm = shelfBase.get(itemId);
					const shelfBaseAmount = bm ? (bm.get(ingredient.baseUnit) || 0) : 0;
					const needed = (ingredient.baseQuantity as number) - shelfBaseAmount;
					if (needed <= 0) continue;
					missing.push({
						item: { _id: ingredient.item.id, name: ingredient.item.name },
						amount: needed,
						unit: ingredient.baseUnit,
					});
				} else {
					// Fallback: exact unit string match
					const requiredUnit = ingredient.unit.toLowerCase();
					const em = shelfExact.get(itemId);
					const shelfAmount = em ? (em.get(requiredUnit) || 0) : 0;
					const needed = requiredAmount - shelfAmount;
					if (needed <= 0) continue;
					missing.push({
						item: { _id: ingredient.item.id, name: ingredient.item.name },
						amount: needed,
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
