import { NextFunction, Request, Response } from "express";

import { prisma } from "../../lib/prisma";
import { toMongoDoc } from "../../lib/serialize";

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

	let whereClause: any = { householdId };
	if (storeId) {
		whereClause = {
			householdId,
			OR: [
				{ connectedStores: { none: {} } },
				{ connectedStores: { some: { storeId } } },
			],
		};
	}

	prisma.item
		.count({ where: whereClause })
		.then((total) => {
			return prisma.item
				.findMany({
					where: whereClause,
					skip,
					take: limit,
					include: { connectedStores: true },
				})
				.then((items) => {
					res.status(200).json({
						items: items.map((item) => ({
							...toMongoDoc(item),
							connectedStores: item.connectedStores.map((cs) => ({
								storeId: cs.storeId,
								storeName: cs.storeName,
								storeItemId: cs.storeItemId,
								storeItemName: cs.storeItemName,
							})),
						})),
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

export const getItem = (req: Request, res: Response, next: NextFunction) => {
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

	prisma.item
		.findFirst({
			where: { id, householdId },
			include: {
				type: { select: { id: true, name: true } },
				connectedStores: true,
			},
		})
		.then((item) => {
			if (!item) {
				const error = new Error("Item not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				item: {
					...toMongoDoc(item),
					type: item.type ? { _id: item.type.id, name: item.type.name } : null,
					connectedStores: item.connectedStores.map((cs) => ({
						storeId: cs.storeId,
						storeName: cs.storeName,
						storeItemId: cs.storeItemId,
						storeItemName: cs.storeItemName,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createItem = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const { name, type, connectedStores } = req.body;

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

	const stores: any[] = connectedStores || [];

	prisma.item
		.create({
			data: {
				householdId,
				name,
				...(type !== undefined && { typeId: type }),
				connectedStores: {
					create: stores.map((cs: any) => ({
						storeId: cs.storeId,
						storeName: cs.storeName,
						storeItemId: cs.storeItemId || "",
						storeItemName: cs.storeItemName || "",
					})),
				},
			},
			include: { connectedStores: true },
		})
		.then((result) => {
			res.status(201).json({
				message: "Item created!",
				item: {
					...toMongoDoc(result),
					connectedStores: result.connectedStores.map((cs) => ({
						storeId: cs.storeId,
						storeName: cs.storeName,
						storeItemId: cs.storeItemId,
						storeItemName: cs.storeItemName,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateItem = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { itemId, name, type, connectedStores } = req.body;

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

	prisma.item
		.findFirst({ where: { id: itemId, householdId } })
		.then((item) => {
			if (!item) {
				const error = new Error("Item not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const updateData: any = {};
			if (name !== undefined) updateData.name = name;
			if (type !== undefined) updateData.typeId = type;

			if (connectedStores !== undefined) {
				return prisma.$transaction([
					prisma.itemConnectedStore.deleteMany({ where: { itemId } }),
					prisma.item.update({
						where: { id: itemId },
						data: {
							...updateData,
							connectedStores: {
								create: (connectedStores as any[]).map((cs: any) => ({
									storeId: cs.storeId,
									storeName: cs.storeName,
									storeItemId: cs.storeItemId || "",
									storeItemName: cs.storeItemName || "",
								})),
							},
						},
						include: { connectedStores: true },
					}),
				]).then(([, updated]) => updated);
			}

			return prisma.item.update({
				where: { id: itemId },
				data: updateData,
				include: { connectedStores: true },
			});
		})
		.then((updated: any) => {
			res.status(200).json({
				message: "Item updated successfully",
				item: {
					...toMongoDoc(updated),
					connectedStores: updated.connectedStores.map((cs: any) => ({
						storeId: cs.storeId,
						storeName: cs.storeName,
						storeItemId: cs.storeItemId,
						storeItemName: cs.storeItemName,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.item
		.findFirst({ where: { id: itemId, householdId } })
		.then((item) => {
			if (!item) {
				const error = new Error("Item not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.item.delete({ where: { id: itemId } });
		})
		.then(() => {
			res.status(200).json({ message: "Item deleted successfully" });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
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

	prisma.store
		.findFirst({ where: { id: storeId, householdId } })
		.then((store) => {
			if (!store) {
				const error = new Error("Store not found") as any;
				error.statusCode = 404;
				throw error;
			}

			return prisma.item
				.findFirst({ where: { id: itemId, householdId } })
				.then((item) => {
					if (!item) {
						const error = new Error("Item not found") as any;
						error.statusCode = 404;
						throw error;
					}

					return prisma.item.update({
						where: { id: itemId },
						data: {
							connectedStores: {
								create: {
									storeId: store.id,
									storeName: store.name,
									storeItemId,
									storeItemName,
								},
							},
						},
						include: { connectedStores: true },
					});
				});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Store added to item",
				item: {
					...toMongoDoc(updated),
					connectedStores: updated.connectedStores.map((cs) => ({
						storeId: cs.storeId,
						storeName: cs.storeName,
						storeItemId: cs.storeItemId,
						storeItemName: cs.storeItemName,
					})),
				},
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
