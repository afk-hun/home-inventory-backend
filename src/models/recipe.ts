import mongoose, { Types, Document } from "mongoose";

export interface IIngredient {
	quantity: number;
	unit: string;
	item: Types.ObjectId;
}

export interface IRecipe extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	name: string;
	type?: string;
	ingredients: IIngredient[];
	portion?: number;
	description?: string;
}

const ingredientSchema = new mongoose.Schema<IIngredient>({
	quantity: { type: Number, required: true },
	unit: { type: String, required: true },
	item: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Item",
		required: true,
	},
});

const recipeSchema = new mongoose.Schema<IRecipe>({
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
	name: { type: String, required: true },
	type: { type: String },
	ingredients: { type: [ingredientSchema], default: [] },
	portion: { type: Number },
	description: { type: String },
});

export default mongoose.model<IRecipe>("Recipe", recipeSchema);
