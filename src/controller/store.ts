import { NextFunction, Request, Response } from "express";
import { eq, and, count } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { stores } from "../db/schema";
import { toMongoDoc } from "../lib/serialize";

export const getStore = (req: Request, res: Response, next: NextFunction) => {
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
		const store = db.query.stores.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, id), eq(t.householdId, householdId)),
		}).sync();
		if (!store) {
			const error = new Error("Store not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		res.status(200).json({ store: toMongoDoc(store) });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const getStores = (req: Request, res: Response, next: NextFunction) => {
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

	try {
		const [{ total }] = db.select({ total: count() }).from(stores).where(eq(stores.householdId, householdId)).all();
		const result = db.query.stores.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
			limit,
			offset: skip,
		}).sync();
		res.status(200).json({
			stores: result.map(toMongoDoc),
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createStore = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const name = req.body.name;

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
		const error = new Error("Store name is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const id = createId();
		db.insert(stores).values({ id, householdId, name }).run();
		const result = db.query.stores.findFirst({ where: (t, { eq }) => eq(t.id, id) }).sync()!;
		res.status(201).json({ message: "Store created!", store: toMongoDoc(result) });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const updateStore = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { storeId, name } = req.body;

	if (!storeId) {
		const error = new Error("Store ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const store = db.query.stores.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, storeId), eq(t.householdId, householdId!)),
		}).sync();
		if (!store) {
			const error = new Error("Store not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;

		db.update(stores).set(updateData).where(eq(stores.id, storeId)).run();
		const updated = db.query.stores.findFirst({ where: (t, { eq }) => eq(t.id, storeId) }).sync()!;
		res.status(200).json({
			message: "Store updated successfully",
			store: toMongoDoc(updated),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteStore = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { storeId } = req.body;

	if (!storeId) {
		const error = new Error("Store ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const store = db.query.stores.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, storeId), eq(t.householdId, householdId!)),
		}).sync();
		if (!store) {
			const error = new Error("Store not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(stores).where(eq(stores.id, storeId)).run();
		res.status(200).json({ message: "Store deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
