import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { households, householdMembers } from "../db/schema";
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

	try {
		const result = db.query.households.findMany({
			where: (t, { eq }) => eq(t.ownerId, user.id),
		}).sync();
		res.status(200).json({
			households: result.map((h) => ({
				_id: h.id,
				name: h.name,
				members: [],
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createHousehold = (
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

	try {
		const householdId = createId();
		db.insert(households).values({ id: householdId, name, ownerId: owner.id }).run();
		db.insert(householdMembers).values({ householdId, userId: owner.id }).run();
		res.status(201).json({
			message: "Household created!",
			household: {
				_id: householdId,
				name,
				members: [],
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const household = db.query.households.findFirst({ where: (t, { eq }) => eq(t.id, householdId) }).sync();
		if (!household) {
			const error = new Error("Household not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.update(households).set({ name: newName }).where(eq(households.id, householdId)).run();
		res.status(200).json({
			message: "Household renamed successfully",
			householdId,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const household = db.query.households.findFirst({ where: (t, { eq }) => eq(t.id, householdId) }).sync();
		if (!household) {
			const error = new Error("Household not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(households).where(eq(households.id, householdId)).run();
		res.status(200).json({ message: "Household deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
