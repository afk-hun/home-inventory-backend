import mongoose, { Types, Document } from "mongoose";

export interface IRecipeType extends Document {
	_id: Types.ObjectId;
	name: string;
	householdId: Types.ObjectId;
}

const recipeTypeSchema = new mongoose.Schema<IRecipeType>({
	name: {
		type: String,
		required: true,
	},
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
});

export default mongoose.model<IRecipeType>("RecipeType", recipeTypeSchema);
