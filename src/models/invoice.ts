import mongoose, { Types, Document } from "mongoose";
import { IInvoiceItem } from "./invoiceItem";

interface IInvoiceElement extends Omit<
	IInvoiceItem,
	"_id" | "householdId" | "store"
> {}
export interface IInvoice extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	storeId: Types.ObjectId;
	storeName: string;
	storeAddress: string;
	purchaseDate: Date;
	invoiceItems: IInvoiceElement[];
}

const invoiceItemSchema = new mongoose.Schema<IInvoiceElement>(
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
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
	storeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Store",
		required: true,
	},
	storeName: { type: String, required: true },
	storeAddress: { type: String, required: true },
	purchaseDate: { type: Date, required: true },
	invoiceItems: { type: [invoiceItemSchema], default: [] },
});

export default mongoose.model<IInvoice>("Invoice", invoiceSchema);
