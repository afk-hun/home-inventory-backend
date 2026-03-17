import { NextFunction, Request, Response } from "express";

import Invoice from "../models/invoice";

export const getInvoices = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { storeId } = req.query;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	const filter: Record<string, unknown> = { householdId };
	if (storeId && typeof storeId === "string") {
		filter.storeId = storeId;
	}

	Invoice.find(filter)
		.then((invoices) => {
			res.status(200).json({ invoices });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createInvoice = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const { storeId, storeName, storeAddress, purchaseDate, invoiceItems } =
		req.body;

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

	if (!storeId || !storeName || !storeAddress || !purchaseDate) {
		const error = new Error(
			"Store ID, store name, store address, and purchase date are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	const invoice = new Invoice({
		householdId,
		storeId,
		storeName,
		storeAddress,
		purchaseDate: new Date(purchaseDate),
		invoiceItems: invoiceItems || [],
	});

	invoice
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Invoice created!",
				invoice: result,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateInvoice = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const {
		invoiceId,
		storeId,
		storeName,
		storeAddress,
		purchaseDate,
		invoiceItems,
	} = req.body;

	if (!invoiceId) {
		const error = new Error("Invoice ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Invoice.findById(invoiceId)
		.then((invoice) => {
			if (!invoice) {
				const error = new Error("Invoice not found") as any;
				error.statusCode = 404;
				throw error;
			}

			if (storeId !== undefined) invoice.storeId = storeId;
			if (storeName !== undefined) invoice.storeName = storeName;
			if (storeAddress !== undefined) invoice.storeAddress = storeAddress;
			if (purchaseDate !== undefined)
				invoice.purchaseDate = new Date(purchaseDate);
			if (invoiceItems !== undefined)
				invoice.invoiceItems = invoiceItems;

			return invoice.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Invoice updated successfully",
				invoice: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteInvoice = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const invoiceId = req.body.invoiceId;

	if (!invoiceId) {
		const error = new Error("Invoice ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Invoice.findByIdAndDelete(invoiceId)
		.then((result) => {
			if (!result) {
				const error = new Error("Invoice not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ message: "Invoice deleted successfully" });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
