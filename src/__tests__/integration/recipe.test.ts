import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../../app";
import User from "../../models/user";
import Household from "../../models/household";
import Item from "../../models/item";
import Shelf from "../../models/shelf";

let agent: ReturnType<typeof request.agent>;

beforeEach(() => {
	agent = request.agent(app);
});

async function getCsrf() {
	const res = await agent.get("/auth/csrf-token");
	return res.body.csrfToken as string;
}

/** Creates a user + household in DB, logs in via HTTP, returns the user. */
async function loginAsNewUser(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const user = await new User({
		name: "Recipe Test User",
		email,
		password: hashed,
	}).save();

	await new Household({
		name: "Recipe Test Household",
		owner: user,
		members: [user],
	}).save();

	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });

	return user;
}

/** Creates a user + household in DB, logs in via HTTP, returns both user and household. */
async function loginAsNewUserWithHousehold(email: string, password = "password123") {
	const hashed = await bcrypt.hash(password, 1);
	const user = await new User({
		name: "Recipe Test User",
		email,
		password: hashed,
	}).save();

	const household = await new Household({
		name: "Recipe Test Household",
		owner: user,
		members: [user],
	}).save();

	const csrf = await getCsrf();
	await agent
		.post("/auth/login")
		.set("x-csrf-token", csrf)
		.send({ email, password });

	return { user, household };
}

// ---------------------------------------------------------------------------
// GET /recipe/recipes
// ---------------------------------------------------------------------------

describe("GET /recipe/recipes", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.get("/recipe/recipes")
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 200 with empty recipes array when authenticated and no recipes exist", async () => {
		await loginAsNewUser("rec-get-empty@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.get("/recipe/recipes")
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body.recipes).toBeDefined();
		expect(Array.isArray(res.body.recipes)).toBe(true);
		expect(res.body.recipes).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// GET /recipe/recipes/:id
// ---------------------------------------------------------------------------

describe("GET /recipe/recipes/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const res = await agent
			.get(`/recipe/recipes/${fakeId}`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 404 for a non-existent recipe id", async () => {
		await loginAsNewUser("rec-get-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.get(`/recipe/recipes/${fakeId}`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(404);
	});

	it("returns 200 with the recipe after it has been created", async () => {
		await loginAsNewUser("rec-get-200@test.com");

		// Create a recipe first
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Fetched Recipe" });
		expect(createRes.status).toBe(201);
		const recipeId = createRes.body.recipe._id;

		const getByIdCsrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const res = await agent
			.get(`/recipe/recipes/${recipeId}`)
			.set("x-csrf-token", getByIdCsrf);

		expect(res.status).toBe(200);
		expect(res.body.recipe).toBeDefined();
		expect(res.body.recipe._id).toBe(recipeId);
		expect(res.body.recipe.name).toBe("Fetched Recipe");
	});
});

// ---------------------------------------------------------------------------
// POST /recipe/recipes
// ---------------------------------------------------------------------------

describe("POST /recipe/recipes", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const res = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({ name: "Ghost Recipe" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		await loginAsNewUser("rec-create-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({});

		expect(res.status).toBe(400);
	});

	it("returns 201 with correct body shape on valid create", async () => {
		await loginAsNewUser("rec-create-201@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({
				name: "My Test Recipe",
				type: "Dinner",
				ingredients: [
					{
						quantity: 2,
						unit: "cup",
						item: "507f1f77bcf86cd799439011",
					},
				],
				portion: 4,
				description: "A delicious test recipe",
			});

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Recipe created!");
		expect(res.body.recipe).toBeDefined();
		expect(res.body.recipe._id).toBeDefined();
		expect(res.body.recipe.name).toBe("My Test Recipe");
		expect(res.body.recipe.type).toBe("Dinner");
		expect(res.body.recipe.portion).toBe(4);
		expect(res.body.recipe.description).toBe("A delicious test recipe");
		expect(res.body.recipe.householdId).toBeDefined();
		expect(Array.isArray(res.body.recipe.ingredients)).toBe(true);
		expect(res.body.recipe.ingredients).toHaveLength(1);
	});

	it("returns 201 with minimal body (name only)", async () => {
		await loginAsNewUser("rec-create-minimal@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({ name: "Minimal Recipe" });

		expect(res.status).toBe(201);
		expect(res.body.recipe.name).toBe("Minimal Recipe");
		expect(Array.isArray(res.body.recipe.ingredients)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// PATCH /recipe/recipes
// ---------------------------------------------------------------------------

describe("PATCH /recipe/recipes", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const res = await agent
			.patch("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({ recipeId: fakeId, name: "Ghost" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when recipeId is missing", async () => {
		await loginAsNewUser("rec-patch-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.patch("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({ name: "No ID" });

		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent recipeId", async () => {
		await loginAsNewUser("rec-patch-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.patch("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({ recipeId: fakeId, name: "Ghost Recipe" });

		expect(res.status).toBe(404);
	});

	it("returns 200 and the update is reflected in GET", async () => {
		await loginAsNewUser("rec-patch-200@test.com");

		// Create a recipe
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Before Update", description: "Original" });
		expect(createRes.status).toBe(201);
		const recipeId = createRes.body.recipe._id;

		// Update it
		const patchCsrf = await getCsrf();
		const patchRes = await agent
			.patch("/recipe/recipes")
			.set("x-csrf-token", patchCsrf)
			.send({ recipeId, name: "After Update", description: "Updated desc" });

		expect(patchRes.status).toBe(200);
		expect(patchRes.body.message).toBe("Recipe updated successfully");
		expect(patchRes.body.recipe).toBeDefined();
		expect(patchRes.body.recipe.name).toBe("After Update");

		// Verify change is reflected in GET by ID
		const getByIdCsrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get(`/recipe/recipes/${recipeId}`)
			.set("x-csrf-token", getByIdCsrf);

		expect(getRes.status).toBe(200);
		expect(getRes.body.recipe.name).toBe("After Update");
		expect(getRes.body.recipe.description).toBe("Updated desc");
	});
});

// ---------------------------------------------------------------------------
// DELETE /recipe/recipes
// ---------------------------------------------------------------------------

describe("DELETE /recipe/recipes", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const res = await agent
			.delete("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({ recipeId: fakeId });
		expect(res.status).toBe(401);
	});

	it("returns 400 when recipeId is missing", async () => {
		await loginAsNewUser("rec-delete-400@test.com");
		const csrf = await getCsrf();
		const res = await agent
			.delete("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({});

		expect(res.status).toBe(400);
	});

	it("returns 404 for a non-existent recipeId", async () => {
		await loginAsNewUser("rec-delete-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.delete("/recipe/recipes")
			.set("x-csrf-token", csrf)
			.send({ recipeId: fakeId });

		expect(res.status).toBe(404);
	});

	it("returns 200 and recipe is no longer in GET list", async () => {
		await loginAsNewUser("rec-delete-200@test.com");

		// Create two recipes
		const csrf1 = await getCsrf();
		const createRes1 = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", csrf1)
			.send({ name: "To Delete" });
		expect(createRes1.status).toBe(201);
		const recipeId = createRes1.body.recipe._id;

		const csrf2 = await getCsrf();
		await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", csrf2)
			.send({ name: "To Keep" });

		// Delete first one
		const deleteCsrf = await getCsrf();
		const deleteRes = await agent
			.delete("/recipe/recipes")
			.set("x-csrf-token", deleteCsrf)
			.send({ recipeId });

		expect(deleteRes.status).toBe(200);
		expect(deleteRes.body.message).toBe("Recipe deleted successfully");

		// Verify only the kept one remains in GET list
		const listCsrf = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get("/recipe/recipes")
			.set("x-csrf-token", listCsrf);

		expect(getRes.status).toBe(200);
		expect(getRes.body.recipes).toHaveLength(1);
		expect(getRes.body.recipes[0].name).toBe("To Keep");
	});

	it("deleted recipe returns 404 when fetched by ID", async () => {
		await loginAsNewUser("rec-delete-gone@test.com");

		// Create a recipe
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", createCsrf)
			.send({ name: "Doomed Recipe" });
		expect(createRes.status).toBe(201);
		const recipeId = createRes.body.recipe._id;

		// Delete it
		const deleteCsrf = await getCsrf();
		await agent
			.delete("/recipe/recipes")
			.set("x-csrf-token", deleteCsrf)
			.send({ recipeId });

		// Verify it's gone
		const getCsrfToken = await agent.get("/auth/csrf-token").then((r: any) => r.body.csrfToken);
		const getRes = await agent
			.get(`/recipe/recipes/${recipeId}`)
			.set("x-csrf-token", getCsrfToken);

		expect(getRes.status).toBe(404);
	});
});

// ---------------------------------------------------------------------------
// GET /recipe/recipes/:id/missing-ingredients
// ---------------------------------------------------------------------------

describe("GET /recipe/recipes/:id/missing-ingredients", () => {
	it("returns 401 when not authenticated", async () => {
		const csrf = await getCsrf();
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const res = await agent
			.get(`/recipe/recipes/${fakeId}/missing-ingredients`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(401);
	});

	it("returns 404 for a non-existent recipe id", async () => {
		await loginAsNewUser("rec-missing-404@test.com");
		const fakeId = new mongoose.Types.ObjectId().toHexString();
		const csrf = await getCsrf();
		const res = await agent
			.get(`/recipe/recipes/${fakeId}/missing-ingredients`)
			.set("x-csrf-token", csrf);
		expect(res.status).toBe(404);
	});

	it("returns 200 with all ingredients missing when shelves are empty", async () => {
		const { household } = await loginAsNewUserWithHousehold("rec-missing-all@test.com");

		// Create an item directly in DB
		const item = await new Item({
			householdId: household._id,
			name: "Flour",
			connectedStores: [],
		}).save();

		// Create a recipe with one ingredient
		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Bread",
				ingredients: [{ quantity: 500, unit: "g", item: item._id.toString() }],
			});
		expect(createRes.status).toBe(201);
		const recipeId = createRes.body.recipe._id;

		const csrf = await getCsrf();
		const res = await agent
			.get(`/recipe/recipes/${recipeId}/missing-ingredients`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body)).toBe(true);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].amount).toBe(500);
		expect(res.body[0].unit).toBe("g");
		expect(res.body[0].item._id).toBe(item._id.toString());
		expect(res.body[0].item.name).toBe("Flour");
	});

	it("returns 200 with empty array when all ingredients are sufficiently stocked", async () => {
		const { household } = await loginAsNewUserWithHousehold("rec-missing-none@test.com");

		const item = await new Item({
			householdId: household._id,
			name: "Sugar",
			connectedStores: [],
		}).save();

		// Create a shelf with enough quantity
		await new Shelf({
			householdId: household._id,
			name: "Pantry",
			items: [{ item: item._id, quantity: 1000, unit: "g" }],
		}).save();

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Cake",
				ingredients: [{ quantity: 200, unit: "g", item: item._id.toString() }],
			});
		expect(createRes.status).toBe(201);
		const recipeId = createRes.body.recipe._id;

		const csrf = await getCsrf();
		const res = await agent
			.get(`/recipe/recipes/${recipeId}/missing-ingredients`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(Array.isArray(res.body)).toBe(true);
		expect(res.body).toHaveLength(0);
	});

	it("returns full required amount (not the difference) when partially stocked", async () => {
		const { household } = await loginAsNewUserWithHousehold("rec-missing-partial@test.com");

		const item = await new Item({
			householdId: household._id,
			name: "Butter",
			connectedStores: [],
		}).save();

		await new Shelf({
			householdId: household._id,
			name: "Fridge",
			items: [{ item: item._id, quantity: 100, unit: "g" }],
		}).save();

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Cookies",
				ingredients: [{ quantity: 400, unit: "g", item: item._id.toString() }],
			});
		expect(createRes.status).toBe(201);
		const recipeId = createRes.body.recipe._id;

		const csrf = await getCsrf();
		const res = await agent
			.get(`/recipe/recipes/${recipeId}/missing-ingredients`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		// Returns full required amount, not the difference (300)
		expect(res.body[0].amount).toBe(400);
	});

	it("treats shelf quantity as 0 when units differ", async () => {
		const { household } = await loginAsNewUserWithHousehold("rec-missing-unit@test.com");

		const item = await new Item({
			householdId: household._id,
			name: "Milk",
			connectedStores: [],
		}).save();

		// Shelf has ml, recipe needs L
		await new Shelf({
			householdId: household._id,
			name: "Fridge",
			items: [{ item: item._id, quantity: 5000, unit: "ml" }],
		}).save();

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Smoothie",
				ingredients: [{ quantity: 2, unit: "L", item: item._id.toString() }],
			});
		expect(createRes.status).toBe(201);
		const recipeId = createRes.body.recipe._id;

		const csrf = await getCsrf();
		const res = await agent
			.get(`/recipe/recipes/${recipeId}/missing-ingredients`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].amount).toBe(2);
		expect(res.body[0].unit).toBe("L");
	});

	it("sums quantities across multiple shelves for the same item and unit", async () => {
		const { household } = await loginAsNewUserWithHousehold("rec-missing-multishelf@test.com");

		const item = await new Item({
			householdId: household._id,
			name: "Rice",
			connectedStores: [],
		}).save();

		// Two shelves each with 300g → total 600g
		await new Shelf({
			householdId: household._id,
			name: "Shelf A",
			items: [{ item: item._id, quantity: 300, unit: "g" }],
		}).save();
		await new Shelf({
			householdId: household._id,
			name: "Shelf B",
			items: [{ item: item._id, quantity: 300, unit: "g" }],
		}).save();

		const createCsrf = await getCsrf();
		const createRes = await agent
			.post("/recipe/recipes")
			.set("x-csrf-token", createCsrf)
			.send({
				name: "Rice Pudding",
				// Needs 500g — shelf total is 600g → sufficient
				ingredients: [{ quantity: 500, unit: "g", item: item._id.toString() }],
			});
		expect(createRes.status).toBe(201);
		const recipeId = createRes.body.recipe._id;

		const csrf = await getCsrf();
		const res = await agent
			.get(`/recipe/recipes/${recipeId}/missing-ingredients`)
			.set("x-csrf-token", csrf);

		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(0);
	});
});
