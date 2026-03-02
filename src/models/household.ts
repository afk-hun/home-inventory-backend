import mongoose, { Types, Document } from "mongoose";
import { IUser } from "./user";

export interface IHousehold extends Document {
	_id: Types.ObjectId;
	name: string;
	owner: Omit<IUser, "password">;
	members: Omit<IUser, "password">[];
}
const Schema = mongoose.Schema;

const householdSchema = new Schema<IHousehold>({
	name: {
		type: String,
		required: true,
	},
	owner: {
		type: Object,
		required: true,
	},
	members: {
		type: [Object],
		required: true,
	},
});


// TODO check how to use these
// householdSchema.methods.setName = function (name: string) {
// 	this.name = name;
// 	return this.save();
// }

// householdSchema.methods.setOwner = function (owner: string) {
// 	this.owner = owner;
// 	return this.save();
// }

// householdSchema.methods.addUserToHousehold = function (userId: string) {
// 	this.members.push({ name });
// 	return this.save();
// }

// householdSchema.methods.removeUserFromHousehold = function (name: string) {
// 	this.members = this.members.filter((user: IUser) => user.name !== name);
// 	return this.save();
// }

// householdSchema.methods.isUserInHousehold = function (name: string) {
// 	return this.members.some((user: IUser) => user.name === name);
// }

// householdSchema.methods.getHouseholdUsers = function () {
// 	return user.find({ name: { $in: this.members.map((member: IUser) => member.name) } });
// }

export default mongoose.model<IHousehold>("Household", householdSchema);
