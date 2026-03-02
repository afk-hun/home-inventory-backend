import { NextFunction, Request, Response } from "express";

import Household, { IHousehold } from "../models/household";
import User, { IUser } from "../models/user";

export const getHouseholds = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const userId = req.body.userId;

	if (!userId) {
		const error = new Error("User ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Household.find({ owner: userId })
		.then((households) => {
			res.status(200).json({
				households: households.map((household) => ({
					id: household._id,
					name: household.name,
					members: household.members,
				})),
			});
		})
		.catch((err) => {
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
	const owner = req.body.owner;

	if (!name || !owner) {
		const error = new Error("Name and owner are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const ownerData = User.findById(owner).select("-password").exec()
		.then((user) => {
			if (!user) {
				const error = new Error("User not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return user;
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});

	const household = new Household({
		name,
		owner: await ownerData,
		members: [await ownerData],
	});

	household
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Household created!",
				householdId: result._id,
			});
		})
		.catch((err) => {
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
		const error = new Error("Household ID and new name are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Household.findById(householdId)
		.then((household) => {
			if (!household) {
				const error = new Error("Household not found") as any;
				error.statusCode = 404;
				throw error;
			}
			household.name = newName;
			return household.save();
		})
		.then((updatedHousehold) => {
			res.status(200).json({
				message: "Household renamed successfully",
				householdId: updatedHousehold._id,
			});
		})
		.catch((err) => {
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

	Household.findByIdAndDelete(householdId)
		.then((result) => {
			if (!result) {
				const error = new Error("Household not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				message: "Household deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};
