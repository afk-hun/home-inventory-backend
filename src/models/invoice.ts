import mongoose, { Types, Document } from "mongoose";

export interface IInvoiceItem {
	inStoreId: string;
	inStoreName: string;
	inStorePrice: number;
	inStoreUnitPrice: number;
	inStoreQuantity: string;
	inStoreUnit: string;
	inStoreTaxType: string;
}

export interface IInvoice extends Document {
	_id: Types.ObjectId;
	storeName: string;
	storeAddress: string;
	purchaseDate: Date;
	invoiceItems: IInvoiceItem[];
}

const invoiceItemSchema = new mongoose.Schema<IInvoiceItem>(
	{
		inStoreId: { type: String, required: true },
		inStoreName: { type: String, required: true },
		inStorePrice: { type: Number, required: true },
		inStoreUnitPrice: { type: Number, required: true },
		inStoreQuantity: { type: String, required: true },
		inStoreUnit: { type: String, required: true },
		inStoreTaxType: { type: String, required: true },
	},
	{ _id: false },
);

const invoiceSchema = new mongoose.Schema<IInvoice>({
	storeName: { type: String, required: true },
	storeAddress: { type: String, required: true },
	purchaseDate: { type: Date, required: true },
	invoiceItems: { type: [invoiceItemSchema], default: [] },
});

export default mongoose.model<IInvoice>("Invoice", invoiceSchema);
