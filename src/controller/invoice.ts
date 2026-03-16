import { NextFunction, Request, Response } from "express";

import Invoice from "../models/invoice";

export const getInvoice = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const { id } = req.params;

	if (!user) {
		const error = new Error("User not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!id) {
		const error = new Error("Invoice ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Invoice.findById(id)
		.then((invoice) => {
			if (!invoice) {
				const error = new Error("Invoice not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ invoice });
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
	const { storeName, storeAddress, purchaseDate, invoiceItems } = req.body;

	if (!user) {
		const error = new Error("User not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!storeName || !storeAddress || !purchaseDate) {
		const error = new Error(
			"Store name, store address, and purchase date are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	const invoice = new Invoice({
		storeName,
		storeAddress,
		purchaseDate: new Date(purchaseDate),
		invoiceItems: invoiceItems ?? [],
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
	const { invoiceId, storeName, storeAddress, purchaseDate, invoiceItems } =
		req.body;

	if (!invoiceId) {
		const error = new Error(
			"Invoice ID is required",
		) as any;
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

			if (storeName !== undefined) invoice.storeName = storeName;
			if (storeAddress !== undefined) invoice.storeAddress = storeAddress;
			if (purchaseDate !== undefined)
				invoice.purchaseDate = new Date(purchaseDate);
			if (invoiceItems !== undefined) invoice.invoiceItems = invoiceItems;

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
			res.status(200).json({
				message: "Invoice deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
