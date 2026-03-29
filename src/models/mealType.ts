import mongoose, { Types, Document } from "mongoose";

export interface IMealType extends Document {
	_id: Types.ObjectId;
	name: string;
	householdId: Types.ObjectId;
}

const mealTypeSchema = new mongoose.Schema<IMealType>({
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

export default mongoose.model<IMealType>("MealType", mealTypeSchema);
