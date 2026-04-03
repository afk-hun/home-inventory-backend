import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";
import { setHouseholdCookie } from "./auth";

export const setHousehold = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.body.householdId;

	if (!householdId) {
		const error = new Error("Household ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	setHouseholdCookie(res, householdId);
	res.status(200).json({
		message: "Household set successfully",
	});
};

export const getHouseholds = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;

	if (!user) {
		const error = new Error("User not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	prisma.household
		.findMany({ where: { ownerId: user.id } })
		.then((households) => {
			res.status(200).json({
				households: households.map((h) => ({
					_id: h.id,
					name: h.name,
					members: [],
				})),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const createHousehold = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const name = req.body.name;
	const owner = req.user;

	if (!name || !owner) {
		const error = new Error("Name and owner are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.household
		.create({
			data: {
				name,
				ownerId: owner.id,
				members: {
					create: [{ userId: owner.id }],
				},
			},
		})
		.then((result) => {
			res.status(201).json({
				message: "Household created!",
				household: toMongoDoc(result),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const renameHousehold = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.body.householdId;
	const newName = req.body.name;

	if (!householdId || !newName) {
		const error = new Error(
			"Household ID and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.household
		.findUnique({ where: { id: householdId } })
		.then((household) => {
			if (!household) {
				const error = new Error("Household not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.household.update({
				where: { id: householdId },
				data: { name: newName },
			});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Household renamed successfully",
				householdId: updated.id,
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const deleteHousehold = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.body.householdId;

	if (!householdId) {
		const error = new Error("Household ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.household
		.findUnique({ where: { id: householdId } })
		.then((household) => {
			if (!household) {
				const error = new Error("Household not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.household.delete({ where: { id: householdId } });
		})
		.then(() => {
			res.status(200).json({
				message: "Household deleted successfully",
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};
