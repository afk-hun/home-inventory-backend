import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { unitTypes } from "../db/schema";

export const getUnitTypes = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
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
		const result = db.query.unitTypes.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
		}).sync();
		res.status(200).json({
			unitTypes: result.map((ut) => ({
				_id: ut.id,
				name: ut.name,
				householdId: ut.householdId,
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createUnitType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const name = req.body.name;
	const owner = req.user;
	const householdId = req.householdId;

	if (!name || !owner || !householdId) {
		const error = new Error("Name, owner, and household ID are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const id = createId();
		db.insert(unitTypes).values({ id, name, householdId }).run();
		res.status(201).json({
			message: "Unit type created!",
			unitType: { _id: id, name, householdId },
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const renameUnitType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const unitTypeId = req.body.unitTypeId;
	const newName = req.body.name;

	if (!householdId || !unitTypeId || !newName) {
		const error = new Error(
			"Household ID, unit type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const unitType = db.query.unitTypes.findFirst({ where: (t, { eq }) => eq(t.id, unitTypeId) }).sync();
		if (!unitType) {
			const error = new Error("Unit type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.update(unitTypes).set({ name: newName }).where(eq(unitTypes.id, unitTypeId)).run();
		res.status(200).json({
			message: "Unit type renamed successfully",
			unitTypeId,
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteUnitType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const unitTypeId = req.body.unitTypeId;

	if (!unitTypeId) {
		const error = new Error("Unit type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const unitType = db.query.unitTypes.findFirst({ where: (t, { eq }) => eq(t.id, unitTypeId) }).sync();
		if (!unitType) {
			const error = new Error("Unit type not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(unitTypes).where(eq(unitTypes.id, unitTypeId)).run();
		res.status(200).json({ message: "Unit type deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
