import mongoose, { Types, Document } from "mongoose";
import user from "./user";

export interface IHousehold extends Document {
	_id: Types.ObjectId;
	name: string;
	owner: string;
	users: string[];
}
const Schema = mongoose.Schema;

const householdSchema = new Schema<IHousehold>({
	name: {
		type: String,
		required: true,
	},
	owner: {
		type: String,
		required: true,
	},
	users: {
		type: [String],
		required: true,
	},
});

householdSchema.methods.setName = function (name: string) {
	this.name = name;
	return this.save();
}

householdSchema.methods.setOwner = function (owner: string) {
	this.owner = owner;
	return this.save();
}

householdSchema.methods.addUserToHousehold = function (name: string) {
	this.users.push(name);
	return this.save();
}

householdSchema.methods.removeUserFromHousehold = function (name: string) {
	this.users = this.users.filter((user: string) => user !== name);
	return this.save();
}

householdSchema.methods.isUserInHousehold = function (name: string) {
	return this.users.includes(name);
}

householdSchema.methods.getHouseholdUsers = function () {
	return user.find({ name: { $in: this.users } });
}

export default mongoose.model<IHousehold>("Household", householdSchema);
