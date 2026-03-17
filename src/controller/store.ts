import { NextFunction, Request, Response } from "express";

import Store from "../models/store";

export const getStore = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const { id } = req.params;

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

	Store.findOne({ _id: id, householdId })
		.then((store) => {
			if (!store) {
				const error = new Error("Store not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ store });
		})
		.catch((err) => {
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

	Store.countDocuments({ householdId })
		.then((total) => {
			return Store.find({ householdId })
				.skip(skip)
				.limit(limit)
				.then((stores) => {
					res.status(200).json({
						stores,
						pagination: {
							total,
							page,
							limit,
							totalPages: Math.ceil(total / limit),
						},
					});
				});
		})
		.catch((err) => {
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

	const store = new Store({ householdId, name });

	store
		.save()
		.then((result) => {
			res.status(201).json({ message: "Store created!", store: result });
		})
		.catch((err) => {
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

	Store.findOne({ _id: storeId, householdId })
		.then((store) => {
			if (!store) {
				const error = new Error("Store not found") as any;
				error.statusCode = 404;
				throw error;
			}

			if (name !== undefined) store.name = name;

			return store.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Store updated successfully",
				store: updated,
			});
		})
		.catch((err) => {
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

	Store.findOneAndDelete({ _id: storeId, householdId })
		.then((result) => {
			if (!result) {
				const error = new Error("Store not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ message: "Store deleted successfully" });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
