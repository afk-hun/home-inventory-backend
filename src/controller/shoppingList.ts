import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";
import { toBase } from "../lib/units";

export const getShoppingLists = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	prisma.shoppingList
		.findMany({ where: { householdId }, include: { items: true } })
		.then((lists) => {
			res.status(200).json({
				shoppingLists: lists.map((list) => ({
					...toMongoDoc(list),
					items: list.items.map((item) => ({
						_id: item.id,
						itemName: item.itemName,
						quantity: item.quantity,
						unit: item.unit,
						checked: item.checked,
					})),
				})),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getShoppingList = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const shoppingListId = req.params.shoppingListId as string;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shoppingListId) {
		const error = new Error("Shopping list ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.shoppingList
		.findFirst({
			where: { id: shoppingListId, householdId },
			include: { items: true },
		})
		.then((list) => {
			if (!list) {
				const error = new Error("Shopping list not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				shoppingList: {
					...toMongoDoc(list),
					items: list.items.map((item) => ({
						_id: item.id,
						itemName: item.itemName,
						quantity: item.quantity,
						unit: item.unit,
						checked: item.checked,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createShoppingList = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { name, storeId, items } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!name || !storeId) {
		const error = new Error("Name and store ID are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const itemList: any[] = items || [];

	prisma.shoppingList
		.create({
			data: {
				householdId,
				name,
				storeId,
				items: {
					create: itemList.map((item: any) => {
						const { baseQuantity, baseUnit } = toBase(item.quantity, item.unit);
						return {
							itemName: item.itemName,
							quantity: item.quantity,
							unit: item.unit,
							checked: item.checked ?? false,
							...(baseQuantity !== null && { baseQuantity }),
							...(baseUnit !== null && { baseUnit }),
						};
					}),
				},
			},
			include: { items: true },
		})
		.then((result) => {
			res.status(201).json({
				message: "Shopping list created!",
				shoppingList: {
					...toMongoDoc(result),
					items: result.items.map((item) => ({
						_id: item.id,
						itemName: item.itemName,
						quantity: item.quantity,
						unit: item.unit,
						checked: item.checked,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateShoppingList = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shoppingListId, name, storeId, items } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shoppingListId) {
		const error = new Error("Shopping list ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.shoppingList
		.findFirst({ where: { id: shoppingListId, householdId } })
		.then((list) => {
			if (!list) {
				const error = new Error("Shopping list not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const updateData: any = {};
			if (name !== undefined) updateData.name = name;
			if (storeId !== undefined) updateData.storeId = storeId;

			if (items !== undefined) {
				return prisma.$transaction([
					prisma.shoppingListItem.deleteMany({ where: { shoppingListId } }),
					prisma.shoppingList.update({
						where: { id: shoppingListId },
						data: {
							...updateData,
							items: {
								create: (items as any[]).map((item: any) => {
									const { baseQuantity, baseUnit } = toBase(item.quantity, item.unit);
									return {
										itemName: item.itemName,
										quantity: item.quantity,
										unit: item.unit,
										checked: item.checked ?? false,
										...(baseQuantity !== null && { baseQuantity }),
										...(baseUnit !== null && { baseUnit }),
									};
								}),
							},
						},
						include: { items: true },
					}),
				]).then(([, updated]) => updated);
			}

			return prisma.shoppingList.update({
				where: { id: shoppingListId },
				data: updateData,
				include: { items: true },
			});
		})
		.then((updated: any) => {
			res.status(200).json({
				message: "Shopping list updated successfully",
				shoppingList: {
					...toMongoDoc(updated),
					items: updated.items.map((item: any) => ({
						_id: item.id,
						itemName: item.itemName,
						quantity: item.quantity,
						unit: item.unit,
						checked: item.checked,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteShoppingList = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shoppingListId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shoppingListId) {
		const error = new Error("Shopping list ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.shoppingList
		.findFirst({ where: { id: shoppingListId, householdId } })
		.then((list) => {
			if (!list) {
				const error = new Error("Shopping list not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.shoppingList.delete({ where: { id: shoppingListId } });
		})
		.then(() => {
			res.status(200).json({ message: "Shopping list deleted successfully" });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
