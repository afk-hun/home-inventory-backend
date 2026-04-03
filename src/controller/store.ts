import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
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

	prisma.store
		.findFirst({ where: { id, householdId } })
		.then((store) => {
			if (!store) {
				const error = new Error("Store not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ store: toMongoDoc(store) });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.store
		.count({ where: { householdId } })
		.then((total) => {
			return prisma.store
				.findMany({ where: { householdId }, skip, take: limit })
				.then((stores) => {
					res.status(200).json({
						stores: stores.map(toMongoDoc),
						pagination: {
							total,
							page,
							limit,
							totalPages: Math.ceil(total / limit),
						},
					});
				});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.store
		.create({ data: { householdId, name } })
		.then((result) => {
			res.status(201).json({ message: "Store created!", store: toMongoDoc(result) });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.store
		.findFirst({ where: { id: storeId, householdId } })
		.then((store) => {
			if (!store) {
				const error = new Error("Store not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const updateData: any = {};
			if (name !== undefined) updateData.name = name;

			return prisma.store.update({ where: { id: storeId }, data: updateData });
		})
		.then((updated) => {
			res.status(200).json({
				message: "Store updated successfully",
				store: toMongoDoc(updated),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.store
		.findFirst({ where: { id: storeId, householdId } })
		.then((store) => {
			if (!store) {
				const error = new Error("Store not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.store.delete({ where: { id: storeId } });
		})
		.then(() => {
			res.status(200).json({ message: "Store deleted successfully" });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
