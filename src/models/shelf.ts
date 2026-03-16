import mongoose, { Types, Document } from "mongoose";

export interface IShelfItem {
	_id: Types.ObjectId;
	item: Types.ObjectId;
	itemName?: string;
	quantity: number;
	unit?: string;
}

export interface IShelf extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	name: string;
	place?: string;
	type?: string;
	items: IShelfItem[];
}

const shelfItemSchema = new mongoose.Schema<IShelfItem>({
	item: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Item",
		required: true,
	},
	quantity: { type: Number, required: true },
	unit: { type: String },
	itemName: { type: String },
});

const shelfSchema = new mongoose.Schema<IShelf>({
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
	name: { type: String, required: true },
	place: { type: String },
	type: { type: String },
	items: { type: [shelfItemSchema], default: [] },
});

export default mongoose.model<IShelf>("Shelf", shelfSchema);
