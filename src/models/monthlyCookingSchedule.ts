import mongoose, { Types, Document } from "mongoose";

export interface IMeal {
	start: Date;
	end: Date;
	mealType: string;
	recipe: Types.ObjectId;
	portion: number;
}

export interface IMonthlyCookingSchedule extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	name: string;
	start: Date;
	end: Date;
	meals: IMeal[];
}

const mealSchema = new mongoose.Schema<IMeal>({
	start: { type: Date, required: true },
	end: { type: Date, required: true },
	mealType: { type: String, required: true },
	recipe: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Recipe",
		required: true,
	},
	portion: { type: Number, required: true },
});

const monthlyCookingScheduleSchema =
	new mongoose.Schema<IMonthlyCookingSchedule>({
		householdId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Household",
			required: true,
		},
		name: { type: String, required: true },
		start: { type: Date, required: true },
		end: { type: Date, required: true },
		meals: { type: [mealSchema], default: [] },
	});

export default mongoose.model<IMonthlyCookingSchedule>(
	"MonthlyCookingSchedule",
	monthlyCookingScheduleSchema,
);
