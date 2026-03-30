import mongoose, { Types, Document } from "mongoose";

export interface IShoppingListItem {
	itemName: string;
	quantity: number;
	unit: string;
}

export interface IShoppingList extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	name: string;
	storeId: Types.ObjectId;
	items: IShoppingListItem[];
}

const shoppingListItemSchema = new mongoose.Schema<IShoppingListItem>(
	{
		itemName: { type: String, required: true },
		quantity: { type: Number, required: true },
		unit: { type: String, required: true },
	},
	{ _id: false },
);

const shoppingListSchema = new mongoose.Schema<IShoppingList>({
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
	name: { type: String, required: true },
	storeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Store",
		required: true,
	},
	items: { type: [shoppingListItemSchema], default: [] },
});

export default mongoose.model<IShoppingList>("ShoppingList", shoppingListSchema);
