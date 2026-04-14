import { NextFunction, Request, Response } from "express";
import { eq, and, or, count } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../../lib/db";
import { items, itemConnectedStores } from "../../db/schema";
import { toMongoDoc } from "../../lib/serialize";
import { getFavoriteItemIdSet } from "./favorite";

function mapItemResponse(item: any, favoriteItemIds?: Set<string>) {
	return {
		...toMongoDoc(item),
		type: item.type ? { _id: item.type.id, name: item.type.name } : null,
		connectedStores: (item.connectedStores ?? []).map((cs: any) => ({
			storeId: cs.storeId,
			storeName: cs.storeName,
			storeItemId: cs.storeItemId,
			storeItemName: cs.storeItemName,
		})),
		isFavorite: favoriteItemIds?.has(item.id) ?? false,
	};
}

export const getItems = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const page = Math.max(1, parseInt(req.query.page as string) || 1);
	const limit = Math.max(1, parseInt(req.query.limit as string) || 5);
	const skip = (page - 1) * limit;

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

	const storeId = req.query.storeId as string | undefined;
	const favoriteItemIds = getFavoriteItemIdSet(user.id, householdId);

	try {
		if (storeId) {
			// Items with no connected stores OR connected to this store
			// Need to fetch all and filter in memory (OR queries on relations need subqueries)
			const allItems = db.query.items.findMany({
				where: (t, { eq }) => eq(t.householdId, householdId),
				with: { type: { columns: { id: true, name: true } }, connectedStores: true },
			}).sync();
			const filtered = allItems.filter(
				(item) => item.connectedStores.length === 0 || item.connectedStores.some((cs) => cs.storeId === storeId),
			);
			const total = filtered.length;
			const page_items = filtered.slice(skip, skip + limit);
			res.status(200).json({
				items: page_items.map((item) => mapItemResponse(item, favoriteItemIds)),
				pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
			});
		} else {
			const [{ total }] = db.select({ total: count() }).from(items).where(eq(items.householdId, householdId)).all();
			const result = db.query.items.findMany({
				where: (t, { eq }) => eq(t.householdId, householdId),
				with: { type: { columns: { id: true, name: true } }, connectedStores: true },
				limit,
				offset: skip,
			}).sync();
			res.status(200).json({
				items: result.map((item) => mapItemResponse(item, favoriteItemIds)),
				pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
			});
		}
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const getItem = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const id = req.params.id as string;

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
		const favoriteItemIds = getFavoriteItemIdSet(user.id, householdId);
		const item = db.query.items.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, id), eq(t.householdId, householdId)),
			with: {
				type: { columns: { id: true, name: true } },
				connectedStores: true,
			},
		}).sync();
		if (!item) {
			const error = new Error("Item not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		res.status(200).json({ item: mapItemResponse(item, favoriteItemIds) });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createItem = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const { name, type, connectedStores: csBody } = req.body;

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
		const error = new Error("Item name is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const storesList: any[] = csBody || [];

	try {
		const id = createId();
		db.insert(items).values({
			id,
			householdId,
			name,
			...(type !== undefined && { typeId: type }),
		}).run();
		if (storesList.length > 0) {
			db.insert(itemConnectedStores).values(
				storesList.map((cs: any) => ({
					id: createId(),
					itemId: id,
					storeId: cs.storeId,
					storeName: cs.storeName,
					storeItemId: cs.storeItemId || "",
					storeItemName: cs.storeItemName || "",
				})),
			).run();
		}
		const result = db.query.items.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: { type: { columns: { id: true, name: true } }, connectedStores: true },
		}).sync()!;
		res.status(201).json({
			message: "Item created!",
			item: mapItemResponse(result),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const updateItem = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { itemId, name, type, connectedStores: csBody } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!itemId) {
		const error = new Error("Item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const item = db.query.items.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, itemId), eq(t.householdId, householdId)),
		}).sync();
		if (!item) {
			const error = new Error("Item not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (type !== undefined) updateData.typeId = type;

		if (csBody !== undefined) {
			db.transaction((tx) => {
				tx.delete(itemConnectedStores).where(eq(itemConnectedStores.itemId, itemId)).run();
				if (Object.keys(updateData).length > 0) {
					tx.update(items).set(updateData).where(eq(items.id, itemId)).run();
				}
				if ((csBody as any[]).length > 0) {
					tx.insert(itemConnectedStores).values(
						(csBody as any[]).map((cs: any) => ({
							id: createId(),
							itemId,
							storeId: cs.storeId,
							storeName: cs.storeName,
							storeItemId: cs.storeItemId || "",
							storeItemName: cs.storeItemName || "",
						})),
					).run();
				}
			});
		} else if (Object.keys(updateData).length > 0) {
			db.update(items).set(updateData).where(eq(items.id, itemId)).run();
		}

		const updated = db.query.items.findFirst({
			where: (t, { eq }) => eq(t.id, itemId),
			with: { type: { columns: { id: true, name: true } }, connectedStores: true },
		}).sync()!;
		const favoriteItemIds = req.user && householdId
			? getFavoriteItemIdSet(req.user.id, householdId)
			: undefined;
		res.status(200).json({
			message: "Item updated successfully",
			item: mapItemResponse(updated, favoriteItemIds),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteItem = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { itemId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!itemId) {
		const error = new Error("Item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const item = db.query.items.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, itemId), eq(t.householdId, householdId)),
		}).sync();
		if (!item) {
			const error = new Error("Item not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(items).where(eq(items.id, itemId)).run();
		res.status(200).json({ message: "Item deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const addConnectedStore = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { itemId, storeId, storeItemId, storeItemName } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!itemId || !storeId || !storeItemId || !storeItemName) {
		const error = new Error(
			"Item ID, store ID, store item ID, and store item name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const store = db.query.stores.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, storeId), eq(t.householdId, householdId)),
		}).sync();
		if (!store) {
			const error = new Error("Store not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const item = db.query.items.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, itemId), eq(t.householdId, householdId)),
		}).sync();
		if (!item) {
			const error = new Error("Item not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		db.insert(itemConnectedStores).values({
			id: createId(),
			itemId,
			storeId: store.id,
			storeName: store.name,
			storeItemId,
			storeItemName,
		}).run();

		const updated = db.query.items.findFirst({
			where: (t, { eq }) => eq(t.id, itemId),
			with: { type: { columns: { id: true, name: true } }, connectedStores: true },
		}).sync()!;
		res.status(200).json({
			message: "Store added to item",
			item: mapItemResponse(updated),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
