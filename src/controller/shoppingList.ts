import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { shoppingLists, shoppingListItems } from "../db/schema";
import { toBase } from "../lib/units";

function mapListItems(items: any[]) {
	return items.map((item) => ({
		_id: item.id,
		itemName: item.itemName,
		quantity: item.quantity,
		unit: item.unit,
		checked: item.checked,
	}));
}

function listWithItems(id: string) {
	return db.query.shoppingLists.findFirst({
		where: (t, { eq }) => eq(t.id, id),
		with: { items: true },
	}).sync();
}

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

	try {
		const lists = db.query.shoppingLists.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
			with: { items: true },
		}).sync();
		res.status(200).json({
			shoppingLists: lists.map((list) => ({
				_id: list.id,
				name: list.name,
				householdId: list.householdId,
				storeId: list.storeId,
				items: mapListItems(list.items),
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const list = db.query.shoppingLists.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, shoppingListId), eq(t.householdId, householdId)),
			with: { items: true },
		}).sync();
		if (!list) {
			const error = new Error("Shopping list not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		res.status(200).json({
			shoppingList: {
				_id: list.id,
				name: list.name,
				householdId: list.householdId,
				storeId: list.storeId,
				items: mapListItems(list.items),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const listId = createId();
		db.insert(shoppingLists).values({ id: listId, householdId, name, storeId }).run();
		if (itemList.length > 0) {
			db.insert(shoppingListItems).values(
				itemList.map((item: any) => {
					const { baseQuantity, baseUnit } = toBase(item.quantity, item.unit);
					return {
						id: createId(),
						shoppingListId: listId,
						itemName: item.itemName,
						quantity: item.quantity,
						unit: item.unit,
						checked: item.checked ?? false,
						...(baseQuantity !== null && { baseQuantity }),
						...(baseUnit !== null && { baseUnit }),
					};
				}),
			).run();
		}
		const result = listWithItems(listId)!;
		res.status(201).json({
			message: "Shopping list created!",
			shoppingList: {
				_id: result.id,
				name: result.name,
				householdId: result.householdId,
				storeId: result.storeId,
				items: mapListItems(result.items),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const list = db.query.shoppingLists.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, shoppingListId), eq(t.householdId, householdId)),
		}).sync();
		if (!list) {
			const error = new Error("Shopping list not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (storeId !== undefined) updateData.storeId = storeId;

		if (items !== undefined) {
			db.transaction((tx) => {
				tx.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, shoppingListId)).run();
				if (Object.keys(updateData).length > 0) {
					tx.update(shoppingLists).set(updateData).where(eq(shoppingLists.id, shoppingListId)).run();
				}
				if ((items as any[]).length > 0) {
					tx.insert(shoppingListItems).values(
						(items as any[]).map((item: any) => {
							const { baseQuantity, baseUnit } = toBase(item.quantity, item.unit);
							return {
								id: createId(),
								shoppingListId,
								itemName: item.itemName,
								quantity: item.quantity,
								unit: item.unit,
								checked: item.checked ?? false,
								...(baseQuantity !== null && { baseQuantity }),
								...(baseUnit !== null && { baseUnit }),
							};
						}),
					).run();
				}
			});
		} else if (Object.keys(updateData).length > 0) {
			db.update(shoppingLists).set(updateData).where(eq(shoppingLists.id, shoppingListId)).run();
		}

		const updated = listWithItems(shoppingListId)!;
		res.status(200).json({
			message: "Shopping list updated successfully",
			shoppingList: {
				_id: updated.id,
				name: updated.name,
				householdId: updated.householdId,
				storeId: updated.storeId,
				items: mapListItems(updated.items),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const list = db.query.shoppingLists.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, shoppingListId), eq(t.householdId, householdId)),
		}).sync();
		if (!list) {
			const error = new Error("Shopping list not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(shoppingLists).where(eq(shoppingLists.id, shoppingListId)).run();
		res.status(200).json({ message: "Shopping list deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
