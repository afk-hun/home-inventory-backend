import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";

export const getInvoices = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { storeId } = req.query;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	const where: any = { householdId };
	if (storeId && typeof storeId === "string") {
		where.storeId = storeId;
	}

	prisma.invoice
		.findMany({ where, include: { invoiceItems: true } })
		.then((invoices) => {
			res.status(200).json({
				invoices: invoices.map((inv) => ({
					...toMongoDoc(inv),
					invoiceItems: inv.invoiceItems.map((item) => ({
						_id: item.id,
						inStoreId: item.inStoreId,
						inStoreName: item.inStoreName,
						inStorePrice: item.inStorePrice,
						inStoreUnitPrice: item.inStoreUnitPrice,
						inStoreQuantity: item.inStoreQuantity,
						inStoreUnit: item.inStoreUnit,
						inStoreTaxType: item.inStoreTaxType,
					})),
				})),
			});
		})
		.catch((err: any) => {
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

	const items: any[] = invoiceItems || [];

	prisma.invoice
		.create({
			data: {
				householdId,
				storeId,
				storeName,
				storeAddress,
				purchaseDate: new Date(purchaseDate),
				invoiceItems: {
					create: items.map((item: any) => ({
						inStoreId: item.inStoreId,
						inStoreName: item.inStoreName,
						inStorePrice: item.inStorePrice,
						inStoreUnitPrice: item.inStoreUnitPrice,
						inStoreQuantity: item.inStoreQuantity,
						inStoreUnit: item.inStoreUnit,
						inStoreTaxType: item.inStoreTaxType,
					})),
				},
			},
			include: { invoiceItems: true },
		})
		.then((result) => {
			res.status(201).json({
				message: "Invoice created!",
				invoice: {
					...toMongoDoc(result),
					invoiceItems: result.invoiceItems.map((item) => ({
						_id: item.id,
						inStoreId: item.inStoreId,
						inStoreName: item.inStoreName,
						inStorePrice: item.inStorePrice,
						inStoreUnitPrice: item.inStoreUnitPrice,
						inStoreQuantity: item.inStoreQuantity,
						inStoreUnit: item.inStoreUnit,
						inStoreTaxType: item.inStoreTaxType,
					})),
				},
			});
		})
		.catch((err: any) => {
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

	prisma.invoice
		.findUnique({ where: { id: invoiceId } })
		.then((invoice) => {
			if (!invoice) {
				const error = new Error("Invoice not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const updateData: any = {};
			if (storeId !== undefined) updateData.storeId = storeId;
			if (storeName !== undefined) updateData.storeName = storeName;
			if (storeAddress !== undefined) updateData.storeAddress = storeAddress;
			if (purchaseDate !== undefined) updateData.purchaseDate = new Date(purchaseDate);

			if (invoiceItems !== undefined) {
				return prisma.$transaction([
					prisma.invoiceElement.deleteMany({ where: { invoiceId } }),
					prisma.invoice.update({
						where: { id: invoiceId },
						data: {
							...updateData,
							invoiceItems: {
								create: (invoiceItems as any[]).map((item: any) => ({
									inStoreId: item.inStoreId,
									inStoreName: item.inStoreName,
									inStorePrice: item.inStorePrice,
									inStoreUnitPrice: item.inStoreUnitPrice,
									inStoreQuantity: item.inStoreQuantity,
									inStoreUnit: item.inStoreUnit,
									inStoreTaxType: item.inStoreTaxType,
								})),
							},
						},
						include: { invoiceItems: true },
					}),
				]).then(([, updated]) => updated);
			}

			return prisma.invoice.update({
				where: { id: invoiceId },
				data: updateData,
				include: { invoiceItems: true },
			});
		})
		.then((updated: any) => {
			res.status(200).json({
				message: "Invoice updated successfully",
				invoice: {
					...toMongoDoc(updated),
					invoiceItems: updated.invoiceItems.map((item: any) => ({
						_id: item.id,
						inStoreId: item.inStoreId,
						inStoreName: item.inStoreName,
						inStorePrice: item.inStorePrice,
						inStoreUnitPrice: item.inStoreUnitPrice,
						inStoreQuantity: item.inStoreQuantity,
						inStoreUnit: item.inStoreUnit,
						inStoreTaxType: item.inStoreTaxType,
					})),
				},
			});
		})
		.catch((err: any) => {
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

	prisma.invoice
		.findUnique({ where: { id: invoiceId } })
		.then((invoice) => {
			if (!invoice) {
				const error = new Error("Invoice not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.invoice.delete({ where: { id: invoiceId } });
		})
		.then(() => {
			res.status(200).json({ message: "Invoice deleted successfully" });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
