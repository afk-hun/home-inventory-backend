import { NextFunction, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { items, shelfItems, shelves, userFavoriteItems } from "../../db/schema";
import { toMongoDoc } from "../../lib/serialize";
import { toBase } from "../../lib/units";

type FavoriteItemRecord = {
	id: string;
	householdId: string;
	name: string;
	type: { id: string; name: string } | null;
};

type FavoriteShelfStock = {
	id: string;
	quantity: number;
	unit: string | null;
	baseQuantity: number | null;
	baseUnit: string | null;
};

function favoriteItemResponse(item: FavoriteItemRecord, stock: FavoriteShelfStock | null) {
	return {
		...toMongoDoc(item),
		type: item.type ? { _id: item.type.id, name: item.type.name } : null,
		isFavorite: true,
		quantity: stock?.quantity ?? null,
		unit: stock?.unit ?? null,
		isAvailable: Boolean(stock),
	};
}

function getPrimaryShelfStock(householdId: string, itemId: string): FavoriteShelfStock | null {
	const stock = db
		.select({
			id: shelfItems.id,
			quantity: shelfItems.quantity,
			unit: shelfItems.unit,
			baseQuantity: shelfItems.baseQuantity,
			baseUnit: shelfItems.baseUnit,
		})
		.from(shelfItems)
		.innerJoin(shelves, eq(shelfItems.shelfId, shelves.id))
		.where(and(eq(shelves.householdId, householdId), eq(shelfItems.itemId, itemId)))
		.all();

	if (stock.length === 0) {
		return null;
	}

	return stock.sort((left, right) => {
		const leftValue = left.baseQuantity ?? left.quantity;
		const rightValue = right.baseQuantity ?? right.quantity;
		return rightValue - leftValue;
	})[0];
}

function getFavoriteItemRecord(householdId: string, itemId: string): FavoriteItemRecord | null {
	return db.query.items.findFirst({
		where: (t, { and, eq }) => and(eq(t.id, itemId), eq(t.householdId, householdId)),
		with: { type: { columns: { id: true, name: true } } },
	}).sync() as FavoriteItemRecord | null;
}

function getFavoriteSummary(householdId: string, itemId: string) {
	const item = getFavoriteItemRecord(householdId, itemId);
	if (!item) {
		return null;
	}

	return favoriteItemResponse(item, getPrimaryShelfStock(householdId, itemId));
}

export function getFavoriteItemIdSet(userId: string, householdId: string): Set<string> {
	const favorites = db.query.userFavoriteItems.findMany({
		where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.householdId, householdId)),
		columns: { itemId: true },
	}).sync();

	return new Set(favorites.map((favorite) => favorite.itemId));
}

export const getFavoriteItems = (req: Request, res: Response, next: NextFunction) => {
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
		const favorites = db.query.userFavoriteItems.findMany({
			where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.householdId, householdId)),
			with: {
				item: {
					with: { type: { columns: { id: true, name: true } } },
				},
			},
		}).sync();

		const favoriteItems = favorites
			.map((favorite) => favoriteItemResponse(
				favorite.item as FavoriteItemRecord,
				getPrimaryShelfStock(householdId, favorite.itemId),
			))
			.sort((left, right) => left.name.localeCompare(right.name));

		res.status(200).json({ favorites: favoriteItems });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const addFavoriteItem = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const { itemId } = req.body;

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

	if (!itemId || typeof itemId !== "string") {
		const error = new Error("Item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const item = getFavoriteItemRecord(householdId, itemId);
		if (!item) {
			const error = new Error("Item not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const existing = db.query.userFavoriteItems.findFirst({
			where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.householdId, householdId), eq(t.itemId, itemId)),
		}).sync();

		if (!existing) {
			db.insert(userFavoriteItems).values({
				userId: user.id,
				itemId,
				householdId,
			}).run();
		}

		res.status(existing ? 200 : 201).json({
			message: "Favorite item saved",
			itemId,
			isFavorite: true,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const removeFavoriteItem = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const { itemId } = req.body;

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

	if (!itemId || typeof itemId !== "string") {
		const error = new Error("Item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		db.delete(userFavoriteItems)
			.where(and(eq(userFavoriteItems.userId, user.id), eq(userFavoriteItems.householdId, householdId), eq(userFavoriteItems.itemId, itemId)))
			.run();

		res.status(200).json({
			message: "Favorite item removed",
			itemId,
			isFavorite: false,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const removeOneFavoriteItem = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const { itemId } = req.body;

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

	if (!itemId || typeof itemId !== "string") {
		const error = new Error("Item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const favorite = db.query.userFavoriteItems.findFirst({
			where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.householdId, householdId), eq(t.itemId, itemId)),
		}).sync();

		if (!favorite) {
			const error = new Error("Favorite item not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const stock = getPrimaryShelfStock(householdId, itemId);
		if (!stock) {
			const error = new Error("This item is not available at home.") as any;
			error.statusCode = 409;
			return next(error);
		}

		const nextQuantity = stock.quantity - 1;
		if (nextQuantity <= 0) {
			db.delete(shelfItems).where(eq(shelfItems.id, stock.id)).run();
		} else {
			const decrement = stock.unit ? toBase(1, stock.unit) : { baseQuantity: null, baseUnit: null };
			const nextBaseQuantity = stock.baseQuantity !== null && decrement.baseQuantity !== null
				? stock.baseQuantity - decrement.baseQuantity
				: stock.baseQuantity;

			db.update(shelfItems)
				.set({
					quantity: nextQuantity,
					...(nextBaseQuantity !== null ? { baseQuantity: nextBaseQuantity } : {}),
				})
				.where(eq(shelfItems.id, stock.id))
				.run();
		}

		const favoriteItem = getFavoriteSummary(householdId, itemId);
		res.status(200).json({
			message: "Favorite item quantity updated",
			favorite: favoriteItem,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};