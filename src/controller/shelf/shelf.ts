import { NextFunction, Request, Response } from "express";

import { prisma } from "../../lib/prisma";
import { toMongoDoc } from "../../lib/serialize";
import { toBase } from "../../lib/units";

export const getShelves = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const page = Math.max(1, parseInt(req.query.page as string) || 1);
	const limit = Math.max(1, parseInt(req.query.limit as string) || 5);
	const skip = (page - 1) * limit;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	prisma.shelf
		.count({ where: { householdId } })
		.then((total) => {
			return prisma.shelf
				.findMany({ where: { householdId }, skip, take: limit })
				.then((shelves) => {
					res.status(200).json({
						shelves: shelves.map(toMongoDoc),
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

export const getShelf = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { id } = req.params;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	prisma.shelf
		.findFirst({
			where: { id, householdId },
			include: {
				items: {
					include: { item: { select: { id: true, name: true } } },
				},
			},
		})
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				shelf: {
					...toMongoDoc(shelf),
					items: shelf.items.map((si) => ({
						_id: si.id,
						item: { _id: si.item.id, name: si.item.name },
						itemName: si.itemName,
						quantity: si.quantity,
						unit: si.unit,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { name, place, type } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!name) {
		const error = new Error("Shelf name is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.shelf
		.create({
			data: {
				householdId,
				name,
				...(place !== undefined && { place }),
				...(type !== undefined && { type }),
			},
		})
		.then((result) => {
			res.status(201).json({ message: "Shelf created!", shelf: toMongoDoc(result) });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, name, place, type } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId) {
		const error = new Error("Shelf ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.shelf
		.findFirst({ where: { id: shelfId, householdId } })
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const updateData: any = {};
			if (name !== undefined) updateData.name = name;
			if (place !== undefined) updateData.place = place;
			if (type !== undefined) updateData.type = type;

			return prisma.shelf.update({ where: { id: shelfId }, data: updateData });
		})
		.then((updated) => {
			res.status(200).json({
				message: "Shelf updated successfully",
				shelf: toMongoDoc(updated),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId) {
		const error = new Error("Shelf ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.shelf
		.findFirst({ where: { id: shelfId, householdId } })
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.shelf.delete({ where: { id: shelfId } });
		})
		.then(() => {
			res.status(200).json({ message: "Shelf deleted successfully" });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const addShelfItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, itemId, itemName, quantity, unit } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId || (!itemId && !itemName) || quantity === undefined) {
		const error = new Error(
			"Shelf ID, item ID or item name, and quantity are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.shelf
		.findFirst({ where: { id: shelfId, householdId } })
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const { baseQuantity, baseUnit } = unit !== undefined
				? toBase(quantity, unit)
				: { baseQuantity: null, baseUnit: null };

			return prisma.shelfItem
				.create({
					data: {
						shelfId,
						itemId,
						quantity,
						...(itemName !== undefined && { itemName }),
						...(unit !== undefined && { unit }),
						...(baseQuantity !== null && { baseQuantity }),
						...(baseUnit !== null && { baseUnit }),
					},
				})
				.then(() => {
					return prisma.shelf.findFirst({
						where: { id: shelfId },
						include: {
							items: {
								include: { item: { select: { id: true, name: true } } },
							},
						},
					});
				});
		})
		.then((updated: any) => {
			res.status(200).json({
				message: "Item added to shelf",
				shelf: {
					...toMongoDoc(updated),
					items: updated.items.map((si: any) => ({
						_id: si.id,
						item: { _id: si.item.id, name: si.item.name },
						itemName: si.itemName,
						quantity: si.quantity,
						unit: si.unit,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const removeShelfItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, shelfItemId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId || !shelfItemId) {
		const error = new Error("Shelf ID and shelf item ID are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.shelf
		.findFirst({ where: { id: shelfId, householdId } })
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}

			return prisma.shelfItem
				.findFirst({ where: { id: shelfItemId, shelfId } })
				.then((shelfItem) => {
					if (!shelfItem) {
						const error = new Error("Shelf item not found") as any;
						error.statusCode = 404;
						throw error;
					}
					return prisma.shelfItem.delete({ where: { id: shelfItemId } });
				})
				.then(() => {
					return prisma.shelf.findFirst({
						where: { id: shelfId },
						include: {
							items: {
								include: { item: { select: { id: true, name: true } } },
							},
						},
					});
				});
		})
		.then((updated: any) => {
			res.status(200).json({
				message: "Item removed from shelf",
				shelf: {
					...toMongoDoc(updated),
					items: updated.items.map((si: any) => ({
						_id: si.id,
						item: { _id: si.item.id, name: si.item.name },
						itemName: si.itemName,
						quantity: si.quantity,
						unit: si.unit,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
