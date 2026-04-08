import { sqliteTable, text, real, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = sqliteTable("User", {
	id:       text("id").primaryKey(),
	name:     text("name").notNull(),
	email:    text("email").notNull().unique(),
	password: text("password").notNull(),
});

// ── Households ────────────────────────────────────────────────────────────────
export const households = sqliteTable("Household", {
	id:      text("id").primaryKey(),
	name:    text("name").notNull(),
	ownerId: text("ownerId").notNull().references(() => users.id),
});

export const householdMembers = sqliteTable("HouseholdMember", {
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
	userId:      text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.householdId, t.userId] })]);

// ── Lookup / type tables ──────────────────────────────────────────────────────
export const itemTypes = sqliteTable("ItemType", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
});

export const shelfTypes = sqliteTable("ShelfType", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
});

export const shelfPlaceTypes = sqliteTable("ShelfPlaceType", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
});

export const unitTypes = sqliteTable("UnitType", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
});

export const mealTypes = sqliteTable("MealType", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
});

export const recipeTypes = sqliteTable("RecipeType", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
});

// ── Stores ────────────────────────────────────────────────────────────────────
export const stores = sqliteTable("Store", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
});

// ── Items ─────────────────────────────────────────────────────────────────────
export const items = sqliteTable("Item", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
	typeId:      text("typeId").references(() => itemTypes.id),
});

export const itemConnectedStores = sqliteTable("ItemConnectedStore", {
	id:            text("id").primaryKey(),
	itemId:        text("itemId").notNull().references(() => items.id, { onDelete: "cascade" }),
	storeId:       text("storeId").notNull().references(() => stores.id, { onDelete: "cascade" }),
	storeName:     text("storeName").notNull(),
	storeItemId:   text("storeItemId").notNull().default(""),
	storeItemName: text("storeItemName").notNull().default(""),
});

// ── Shelves ───────────────────────────────────────────────────────────────────
export const shelves = sqliteTable("Shelf", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
	place:       text("place"),
	type:        text("type"),
});

export const shelfItems = sqliteTable("ShelfItem", {
	id:           text("id").primaryKey(),
	shelfId:      text("shelfId").notNull().references(() => shelves.id, { onDelete: "cascade" }),
	itemId:       text("itemId").notNull().references(() => items.id, { onDelete: "cascade" }),
	itemName:     text("itemName"),
	quantity:     real("quantity").notNull(),
	unit:         text("unit"),
	baseQuantity: real("baseQuantity"),
	baseUnit:     text("baseUnit"),
});

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoices = sqliteTable("Invoice", {
	id:           text("id").primaryKey(),
	householdId:  text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
	storeId:      text("storeId").notNull().references(() => stores.id),
	storeName:    text("storeName").notNull(),
	storeAddress: text("storeAddress").notNull(),
	purchaseDate: integer("purchaseDate", { mode: "timestamp" }).notNull(),
});

export const invoiceElements = sqliteTable("InvoiceElement", {
	id:               text("id").primaryKey(),
	invoiceId:        text("invoiceId").notNull().references(() => invoices.id, { onDelete: "cascade" }),
	inStoreId:        text("inStoreId").notNull(),
	inStoreName:      text("inStoreName").notNull(),
	inStorePrice:     real("inStorePrice").notNull(),
	inStoreUnitPrice: real("inStoreUnitPrice").notNull(),
	inStoreQuantity:  text("inStoreQuantity").notNull(),
	inStoreUnit:      text("inStoreUnit").notNull(),
	inStoreTaxType:   text("inStoreTaxType").notNull(),
});

export const invoiceItems = sqliteTable("InvoiceItem", {
	id:               text("id").primaryKey(),
	householdId:      text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
	storeId:          text("storeId").notNull(),
	storeName:        text("storeName").notNull(),
	inStoreId:        text("inStoreId").notNull(),
	inStoreName:      text("inStoreName").notNull(),
	inStorePrice:     real("inStorePrice").notNull(),
	inStoreUnitPrice: real("inStoreUnitPrice").notNull(),
	inStoreQuantity:  text("inStoreQuantity").notNull(),
	inStoreUnit:      text("inStoreUnit").notNull(),
	inStoreTaxType:   text("inStoreTaxType").notNull(),
});

// ── Recipes ───────────────────────────────────────────────────────────────────
export const recipes = sqliteTable("Recipe", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
	type:        text("type"),
	portion:     real("portion"),
	description: text("description"),
});

export const ingredients = sqliteTable("Ingredient", {
	id:           text("id").primaryKey(),
	recipeId:     text("recipeId").notNull().references(() => recipes.id, { onDelete: "cascade" }),
	itemId:       text("itemId").notNull().references(() => items.id, { onDelete: "cascade" }),
	quantity:     real("quantity").notNull(),
	unit:         text("unit").notNull(),
	baseQuantity: real("baseQuantity"),
	baseUnit:     text("baseUnit"),
});

// ── Meal planning ─────────────────────────────────────────────────────────────
export const monthlyCookingSchedules = sqliteTable("MonthlyCookingSchedule", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
	start:       integer("start", { mode: "timestamp" }).notNull(),
	end:         integer("end", { mode: "timestamp" }).notNull(),
});

export const meals = sqliteTable("Meal", {
	id:         text("id").primaryKey(),
	scheduleId: text("scheduleId").notNull().references(() => monthlyCookingSchedules.id, { onDelete: "cascade" }),
	recipeId:   text("recipeId").notNull().references(() => recipes.id, { onDelete: "cascade" }),
	mealType:   text("mealType").notNull(),
	start:      integer("start", { mode: "timestamp" }).notNull(),
	end:        integer("end", { mode: "timestamp" }).notNull(),
	portion:    real("portion").notNull(),
	done:       integer("done", { mode: "boolean" }).notNull().default(false),
});

// ── Shopping ──────────────────────────────────────────────────────────────────
export const shoppingLists = sqliteTable("ShoppingList", {
	id:          text("id").primaryKey(),
	name:        text("name").notNull(),
	householdId: text("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
	storeId:     text("storeId").notNull().references(() => stores.id),
});

export const shoppingListItems = sqliteTable("ShoppingListItem", {
	id:             text("id").primaryKey(),
	shoppingListId: text("shoppingListId").notNull().references(() => shoppingLists.id, { onDelete: "cascade" }),
	itemName:       text("itemName").notNull(),
	quantity:       real("quantity").notNull(),
	unit:           text("unit").notNull(),
	baseQuantity:   real("baseQuantity"),
	baseUnit:       text("baseUnit"),
	checked:        integer("checked", { mode: "boolean" }).notNull().default(false),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
	ownedHouseholds:  many(households),
	memberHouseholds: many(householdMembers),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
	owner:           one(users,    { fields: [households.ownerId], references: [users.id] }),
	members:         many(householdMembers),
	items:           many(items),
	shelves:         many(shelves),
	stores:          many(stores),
	invoices:        many(invoices),
	invoiceItems:    many(invoiceItems),
	recipes:         many(recipes),
	schedules:       many(monthlyCookingSchedules),
	shoppingLists:   many(shoppingLists),
	itemTypes:       many(itemTypes),
	shelfTypes:      many(shelfTypes),
	shelfPlaceTypes: many(shelfPlaceTypes),
	unitTypes:       many(unitTypes),
	mealTypes:       many(mealTypes),
	recipeTypes:     many(recipeTypes),
}));

export const householdMembersRelations = relations(householdMembers, ({ one }) => ({
	household: one(households, { fields: [householdMembers.householdId], references: [households.id] }),
	user:      one(users,      { fields: [householdMembers.userId],      references: [users.id] }),
}));

export const itemTypesRelations = relations(itemTypes, ({ one, many }) => ({
	household: one(households, { fields: [itemTypes.householdId], references: [households.id] }),
	items:     many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
	household:       one(households, { fields: [items.householdId], references: [households.id] }),
	type:            one(itemTypes,  { fields: [items.typeId],      references: [itemTypes.id] }),
	connectedStores: many(itemConnectedStores),
	shelfItems:      many(shelfItems),
	ingredients:     many(ingredients),
}));

export const itemConnectedStoresRelations = relations(itemConnectedStores, ({ one }) => ({
	item:  one(items,  { fields: [itemConnectedStores.itemId],  references: [items.id] }),
	store: one(stores, { fields: [itemConnectedStores.storeId], references: [stores.id] }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
	household:      one(households, { fields: [stores.householdId], references: [households.id] }),
	connectedItems: many(itemConnectedStores),
	invoices:       many(invoices),
	shoppingLists:  many(shoppingLists),
}));

export const shelvesRelations = relations(shelves, ({ one, many }) => ({
	household: one(households, { fields: [shelves.householdId], references: [households.id] }),
	items:     many(shelfItems),
}));

export const shelfItemsRelations = relations(shelfItems, ({ one }) => ({
	shelf: one(shelves, { fields: [shelfItems.shelfId], references: [shelves.id] }),
	item:  one(items,   { fields: [shelfItems.itemId],  references: [items.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
	household:    one(households, { fields: [invoices.householdId], references: [households.id] }),
	store:        one(stores,     { fields: [invoices.storeId],     references: [stores.id] }),
	invoiceItems: many(invoiceElements),
}));

export const invoiceElementsRelations = relations(invoiceElements, ({ one }) => ({
	invoice: one(invoices, { fields: [invoiceElements.invoiceId], references: [invoices.id] }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
	household:   one(households, { fields: [recipes.householdId], references: [households.id] }),
	ingredients: many(ingredients),
	meals:       many(meals),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
	recipe: one(recipes, { fields: [ingredients.recipeId], references: [recipes.id] }),
	item:   one(items,   { fields: [ingredients.itemId],   references: [items.id] }),
}));

export const monthlyCookingSchedulesRelations = relations(monthlyCookingSchedules, ({ one, many }) => ({
	household: one(households, { fields: [monthlyCookingSchedules.householdId], references: [households.id] }),
	meals:     many(meals),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
	schedule: one(monthlyCookingSchedules, { fields: [meals.scheduleId], references: [monthlyCookingSchedules.id] }),
	recipe:   one(recipes,                 { fields: [meals.recipeId],   references: [recipes.id] }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
	household: one(households, { fields: [shoppingLists.householdId], references: [households.id] }),
	store:     one(stores,     { fields: [shoppingLists.storeId],     references: [stores.id] }),
	items:     many(shoppingListItems),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
	shoppingList: one(shoppingLists, { fields: [shoppingListItems.shoppingListId], references: [shoppingLists.id] }),
}));
