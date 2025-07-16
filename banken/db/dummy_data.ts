import { Client } from "jsr:@db/postgres";
import { load } from "https://deno.land/std/dotenv/mod.ts";

const env = await load();

const dbPassword = Deno.env.get("DB_PASSWORD") || env["DB_PASSWORD"];
const dbUser = Deno.env.get("DB_USER") || env["DB_USER"];
const hostname = Deno.env.get("DB_HOSTNAME") || env["DB_HOSTNAME"];

const client = new Client({
  user: dbUser,
  password: dbPassword,
  database: "banken",
  hostname: hostname,
  port: 5432,
});

// Create tables (PostgreSQL version)
async function createTables() {
  await client.connect();
  try {
    await client.queryArray(`
      -- Users table to store user accounts
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        role TEXT DEFAULT 'user'
      );
  
      -- Categories for recipes
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        icon_class TEXT
      );
  
      -- Tags for recipes
      CREATE TABLE IF NOT EXISTS tags (
        tag_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#999999'
      );
  
      -- Recipes main table
      CREATE TABLE IF NOT EXISTS recipes (
        recipe_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER,
        difficulty TEXT CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_public BOOLEAN DEFAULT TRUE,
        cover_image_path TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
  
      -- Recipe categories
      CREATE TABLE IF NOT EXISTS recipe_categories (
        recipe_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        PRIMARY KEY (recipe_id, category_id),
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
      );
  
      -- Recipe tags
      CREATE TABLE IF NOT EXISTS recipe_tags (
        recipe_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (recipe_id, tag_id),
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
      );
  
      -- Ingredients table
      CREATE TABLE IF NOT EXISTS ingredients (
        ingredient_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );
  
      -- Recipe ingredients
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        recipe_ingredient_id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        quantity REAL,
        unit TEXT,
        notes TEXT,
        sort_order INTEGER,
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
      );
  
      -- Instructions/steps for recipes
      CREATE TABLE IF NOT EXISTS instructions (
        instruction_id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL,
        step_number INTEGER NOT NULL,
        instruction_text TEXT NOT NULL,
        image_path TEXT,
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
      );
  
      -- Recipe images
      CREATE TABLE IF NOT EXISTS recipe_images (
        image_id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL,
        image_path TEXT NOT NULL,
        caption TEXT,
        is_primary BOOLEAN DEFAULT FALSE,
        sort_order INTEGER,
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
      );
  
      -- User favorites/saved recipes
      CREATE TABLE IF NOT EXISTS user_favorites (
        user_id INTEGER NOT NULL,
        recipe_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, recipe_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
      );
  
      -- Recipe ratings and reviews
      CREATE TABLE IF NOT EXISTS reviews (
        review_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        recipe_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
      );
  
      -- Meal planning
      CREATE TABLE IF NOT EXISTS meal_plans (
        plan_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        plan_name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
  
      CREATE TABLE IF NOT EXISTS meal_plan_recipes (
        plan_recipe_id SERIAL PRIMARY KEY,
        plan_id INTEGER NOT NULL,
        recipe_id INTEGER NOT NULL,
        meal_type TEXT CHECK(meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
        plan_date DATE NOT NULL,
        notes TEXT,
        FOREIGN KEY (plan_id) REFERENCES meal_plans(plan_id) ON DELETE CASCADE,
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
      );

      -- Shopping lists
      CREATE TABLE IF NOT EXISTS shopping_lists (
        list_id SERIAL PRIMARY KEY,
        list_name VARCHAR(255) NOT NULL,
        author_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
              
      -- First, modify the shopping_items table to remove the problematic constraint
      CREATE TABLE IF NOT EXISTS shopping_items (
        item_id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        item_type VARCHAR(50) DEFAULT 'generic' CHECK(item_type IN ('generic', 'ingredient')),
        -- Only populated when item_type = 'ingredient'
        ingredient_id INTEGER NULL,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE SET NULL
      );
          
      -- Then add a partial unique index separately (this achieves the same goal)
      CREATE UNIQUE INDEX IF NOT EXISTS shopping_items_unique_ingredient ON shopping_items (ingredient_id) 
      WHERE ingredient_id IS NOT NULL;
              
      -- Shopping list items
      CREATE TABLE IF NOT EXISTS shopping_list_items (
        list_item_id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity REAL,
        unit VARCHAR(50),
        is_checked BOOLEAN DEFAULT FALSE,
        added_by INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checked_by INTEGER,
        checked_at TIMESTAMP,
        sort_order INTEGER,
        notes TEXT,
        -- Optional: reference to a recipe if this item came from a recipe
        source_recipe_id INTEGER NULL,
        FOREIGN KEY (list_id) REFERENCES shopping_lists(list_id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES shopping_items(item_id) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (checked_by) REFERENCES users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (source_recipe_id) REFERENCES recipes(recipe_id) ON DELETE SET NULL
      );
              
      -- Contributors table
      CREATE TABLE IF NOT EXISTS shopping_list_contributors (
        list_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        can_edit BOOLEAN DEFAULT TRUE,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        added_by INTEGER NOT NULL,
        PRIMARY KEY (list_id, user_id),
        FOREIGN KEY (list_id) REFERENCES shopping_lists(list_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);
  } finally {
    await client.end();
  }
}

async function insertDummyData() {
  await client.connect();
  try {
    // Start a transaction
    await client.queryArray("BEGIN");

    // First, clear existing data
    await clearExistingData();

    // Insert users
    const userIds = await insertUsers();

    // Insert basic entities
    const categorieIds = await insertCategories();
    const tagIds = await insertTags();
    const ingredientIds = await insertIngredients();

    // Insert recipes
    const recipeIds = await insertRecipes(userIds);

    // Insert relationship tables
    await insertRecipeCategories(recipeIds, categorieIds);
    await insertRecipeTags(recipeIds, tagIds);
    await insertRecipeIngredients(recipeIds, ingredientIds);
    await insertInstructions(recipeIds);
    await insertRecipeImages(recipeIds);

    await insertUserFavorites(userIds, recipeIds);
    await insertReviews(userIds, recipeIds);

    const mealPlanIds = await insertMealPlans(userIds);
    await insertMealPlanRecipes(mealPlanIds, recipeIds);

    const listIds = await insertShoppingList(userIds);
    const listItemIds = await insertGenericShoppingListItems();
    listItemIds.concat(await insertLinkedShoppingListItems(ingredientIds));
    await insertShoppingListItems(listIds, listItemIds, userIds, recipeIds);
    await insertShoppingListContributors(listIds, userIds);

    // Commit the transaction
    await client.queryArray("COMMIT");
    console.log("Dummy data inserted successfully!");
  } catch (error) {
    // Rollback if any error occurs
    await client.queryArray("ROLLBACK");
    console.error("Error inserting dummy data:", error);
    throw error; // Re-throw the error after logging
  } finally {
    await client.end();
  }
}

// Helper function to get ingredient IDs
async function getIngredientId(name: string) {
  const result = await client.queryArray(
    `SELECT ingredient_id FROM ingredients WHERE name = $1`,
    [name],
  );
  return result.rows[0]?.[0];
}

async function clearExistingData() {
  await client.queryArray(`
    DELETE FROM shopping_list_contributors;
    DELETE FROM shopping_list_items;
    DELETE FROM shopping_lists;
    DELETE FROM shopping_items;
    DELETE FROM meal_plan_recipes;
    DELETE FROM meal_plans;
    DELETE FROM reviews;
    DELETE FROM user_favorites;
    DELETE FROM recipe_images;
    DELETE FROM instructions;
    DELETE FROM recipe_ingredients;
    DELETE FROM recipe_tags;
    DELETE FROM recipe_categories;
    DELETE FROM recipes;
    DELETE FROM ingredients;
    DELETE FROM tags;
    DELETE FROM categories;
    DELETE FROM users;
  `);
}

function createIngredientMap(
  ingredientNames: string[],
  ingredientIds: number[],
) {
  if (ingredientNames.length !== ingredientIds.length) {
    throw new Error("Ingredient names and IDs arrays must be the same length");
  }

  const map: Record<string, number> = {};
  for (let i = 0; i < ingredientNames.length; i++) {
    map[ingredientNames[i]] = ingredientIds[i];
  }
  return map;
}

async function insertUsers(): Promise<number[]> {
  const result = await client.queryArray<[number]>(
    `
    INSERT INTO users (username, email, password_hash, created_at, last_login, role) VALUES 
    ($1, $2, $3, $4, $5, $6), 
    ($7, $8, $9, $10, $11, $12), 
    ($13, $14, $15, $16, $17, $18), 
    ($19, $20, $21, $22, $23, $24)
    RETURNING user_id
  `,
    [
      "chef_john",
      "john@example.com",
      "$2a$12$qxV3TUr/LyeOzlmZOmWaGuRe9FXY5IAXSfA1W5BYUKCdHsYvyRC8G",
      "2023-01-15T09:30:00",
      "2023-06-20T14:15:00",
      "admin",
      "baking_queen",
      "mary@example.com",
      "$2a$12$qxV3TUr/LyeOzlmZOmWaGuRe9FXY5IAXSfA1W5BYUKCdHsYvyRC8G",
      "2023-02-10T11:20:00",
      "2023-06-18T10:45:00",
      "user",
      "vegan_dave",
      "dave@example.com",
      "$2a$12$qxV3TUr/LyeOzlmZOmWaGuRe9FXY5IAXSfA1W5BYUKCdHsYvyRC8G",
      "2023-03-05T16:40:00",
      "2023-06-19T18:30:00",
      "user",
      "quick_cook",
      "sarah@example.com",
      "$2a$12$qxV3TUr/LyeOzlmZOmWaGuRe9FXY5IAXSfA1W5BYUKCdHsYvyRC8G",
      "2023-04-22T08:15:00",
      "2023-06-20T12:00:00",
      "user",
    ],
  );

  return result.rows.map((row) => row[0]);
}

async function insertCategories(): Promise<number[]> {
  const categories = [
    ["Breakfast", "Morning meals to start your day", "fa-coffee"],
    ["Lunch", "Midday meals for energy", "fa-utensils"],
    ["Dinner", "Evening main courses", "fa-drumstick-bite"],
    ["Dessert", "Sweet treats and desserts", "fa-ice-cream"],
    ["Vegetarian", "Meat-free dishes", "fa-leaf"],
    ["Vegan", "Plant-based recipes", "fa-seedling"],
    ["Quick Meals", "Recipes under 30 minutes", "fa-bolt"],
  ];

  const categoryIds: number[] = [];

  for (const [name, description, iconClass] of categories) {
    const result = await client.queryArray<[number]>(
      `INSERT INTO categories (name, description, icon_class) 
       VALUES ($1, $2, $3) RETURNING category_id`,
      [name, description, iconClass],
    );

    if (!result.rows[0]?.[0]) {
      throw new Error(`No ID returned for category: ${name}`);
    }
    categoryIds.push(result.rows[0][0]);
  }

  return categoryIds;
}

async function insertTags(): Promise<number[]> {
  const tags = [
    ["Vegetarian", "#4CAF50"],
    ["Vegan", "#8BC34A"],
    ["Gluten-Free", "#FFC107"],
    ["Dairy-Free", "#FF9800"],
    ["Low-Carb", "#9C27B0"],
    ["High-Protein", "#2196F3"],
    ["Quick", "#F44336"],
    ["Family-Friendly", "#3F51B5"],
    ["Comfort Food", "#795548"],
    ["Healthy", "#009688"],
  ];

  const tagIds: number[] = [];

  // Option 1: Insert one by one to get individual IDs
  for (const [name, color] of tags) {
    const result = await client.queryArray<[number]>(
      `INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING tag_id`,
      [name, color],
    );
    tagIds.push(result.rows[0][0]);
  }

  return tagIds;
}

async function insertIngredients(): Promise<number[]> {
  const ingredients = [
    ["All-purpose flour", "Regular white flour for baking"],
    ["Eggs", "Large chicken eggs"],
    ["Milk", "Whole milk"],
    ["Butter", "Unsalted butter"],
    ["Sugar", "Granulated white sugar"],
    ["Salt", "Table salt"],
    ["Black pepper", "Freshly ground black pepper"],
    ["Chicken breast", "Boneless, skinless chicken breast"],
    ["Olive oil", "Extra virgin olive oil"],
    ["Garlic", "Fresh garlic cloves"],
    ["Onion", "Yellow onion"],
    ["Tomato", "Fresh ripe tomatoes"],
    ["Basil", "Fresh basil leaves"],
    ["Pasta", "Dried spaghetti"],
    ["Parmesan cheese", "Freshly grated parmesan"],
    ["Chocolate chips", "Semi-sweet chocolate chips"],
    ["Baking powder", "Leavening agent"],
    ["Vanilla extract", "Pure vanilla extract"],
    ["Avocado", "Ripe Hass avocado"],
    ["Lime", "Fresh lime"],
    ["Cilantro", "Fresh cilantro leaves"],
    ["Quinoa", "Organic quinoa"],
    ["Almond milk", "Unsweetened almond milk"],
    ["Banana", "Ripe bananas"],
    ["Oats", "Rolled oats"],
    ["Honey", "Pure honey"],
    ["Cinnamon", "Ground cinnamon"],
    ["Greek yogurt", "Plain Greek yogurt"],
    ["Blueberries", "Fresh blueberries"],
  ];

  const ingredientIds: number[] = [];

  for (const [name, description] of ingredients) {
    const result = await client.queryArray<[number]>(
      `INSERT INTO ingredients (name, description) VALUES ($1, $2) RETURNING ingredient_id`,
      [name, description],
    );

    if (!result.rows[0]?.[0]) {
      throw new Error(`No ID returned for ingredient: ${name}`);
    }
    ingredientIds.push(result.rows[0][0]);
  }
  return ingredientIds;
}

async function insertRecipes(userIds: number[]): Promise<number[]> {
  if (!userIds || userIds.length === 0) {
    throw new Error("No user IDs provided for recipe insertion");
  }

  const [johnId, maryId, daveId, sarahId] = userIds;
  const recipes = [
    [
      johnId,
      "Classic Spaghetti Carbonara",
      "Creamy Italian pasta dish with eggs, cheese, and pancetta",
      10,
      15,
      4,
      "Medium",
      "2023-01-20 10:00:00",
      "2023-01-20 10:00:00",
      true,
      "/images/carbonara.jpg",
    ],
    [
      maryId,
      "Chocolate Chip Cookies",
      "Classic chewy chocolate chip cookies",
      15,
      12,
      24,
      "Easy",
      "2023-02-15 14:30:00",
      "2023-02-15 14:30:00",
      true,
      "/images/cookies.jpg",
    ],
    [
      daveId,
      "Avocado Toast",
      "Simple and healthy avocado toast with lime and chili flakes",
      5,
      2,
      1,
      "Easy",
      "2023-03-10 08:00:00",
      "2023-03-10 08:00:00",
      true,
      "/images/avocado-toast.jpg",
    ],
    [
      sarahId,
      "Quick Chicken Stir Fry",
      "Easy weeknight chicken stir fry with vegetables",
      10,
      15,
      4,
      "Easy",
      "2023-04-25 18:00:00",
      "2023-04-25 18:00:00",
      true,
      "/images/stir-fry.jpg",
    ],
    [
      johnId,
      "Banana Oatmeal Pancakes",
      "Healthy pancakes made with bananas and oats",
      10,
      15,
      8,
      "Easy",
      "2023-05-12 09:00:00",
      "2023-05-12 09:00:00",
      true,
      "/images/pancakes.jpg",
    ],
    [
      maryId,
      "Quinoa Salad Bowl",
      "Nutritious quinoa bowl with fresh vegetables",
      15,
      20,
      2,
      "Medium",
      "2023-05-20 12:00:00",
      "2023-05-20 12:00:00",
      true,
      "/images/quinoa-bowl.jpg",
    ],
    [
      daveId,
      "Vegan Chocolate Mousse",
      "Rich and creamy vegan chocolate dessert",
      15,
      0,
      4,
      "Medium",
      "2023-06-01 20:00:00",
      "2023-06-01 20:00:00",
      true,
      "/images/mousse.jpg",
    ],
  ];

  const recipeIds: number[] = [];

  for (const recipe of recipes) {
    const result = await client.queryArray<[number]>(
      `INSERT INTO recipes (user_id, title, description, prep_time, cook_time, servings, difficulty, created_at, updated_at, is_public, cover_image_path) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING recipe_id`,
      recipe,
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error("No ID returned from recipe insertion");
    }

    recipeIds.push(result.rows[0][0]);
  }

  return recipeIds;
}

async function insertRecipeCategories(
  recipeIds: number[],
  categoryIds: number[],
) {
  type CategoryName =
    | "Breakfast"
    | "Lunch"
    | "Dinner"
    | "Dessert"
    | "Vegetarian"
    | "Vegan"
    | "Quick Meals";
  type CategoryMap = Record<CategoryName, number>;
  // Create a mapping of category names to IDs
  const categoryMap: CategoryMap = {
    "Breakfast": categoryIds[0],
    "Lunch": categoryIds[1],
    "Dinner": categoryIds[2],
    "Dessert": categoryIds[3],
    "Vegetarian": categoryIds[4],
    "Vegan": categoryIds[5],
    "Quick Meals": categoryIds[6],
  };

  // Define type for recipe-category relationships using names
  type RecipeCategory = [
    recipeIndex: number, // Index in recipeIds array
    categoryName: CategoryName, // Category name instead of ID
  ];

  const recipeCategories: RecipeCategory[] = [
    // Spaghetti Carbonara (first recipe)
    [0, "Dinner"],
    [0, "Vegetarian"],
    // Chocolate Chip Cookies (second recipe)
    [1, "Dessert"],
    // Avocado Toast (third recipe)
    [2, "Breakfast"],
    [2, "Vegetarian"],
    [2, "Vegan"],
    // Chicken Stir Fry (fourth recipe)
    [3, "Dinner"],
    [3, "Quick Meals"],
    // Banana Oatmeal Pancakes (fifth recipe)
    [4, "Breakfast"],
    [4, "Vegetarian"],
    // Quinoa Salad Bowl (sixth recipe)
    [5, "Lunch"],
    [5, "Vegetarian"],
    [5, "Vegan"],
    // Vegan Chocolate Mousse (seventh recipe)
    [6, "Dessert"],
    [6, "Vegan"],
  ];

  // Prepare the query with parameterized values
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const rc of recipeCategories) {
    const [recipeIndex, categoryName] = rc;
    const categoryId = categoryMap[categoryName];

    if (categoryId === undefined) {
      throw new Error(`Unknown category name: ${categoryName}`);
    }

    // Validate recipe index
    if (recipeIndex < 0 || recipeIndex >= recipeIds.length) {
      throw new Error(`Invalid recipe index: ${recipeIndex}`);
    }

    values.push(`($${paramIndex}, $${paramIndex + 1})`);
    params.push(recipeIds[recipeIndex], categoryId);
    paramIndex += 2;
  }

  await client.queryArray(
    `INSERT INTO recipe_categories (recipe_id, category_id) VALUES ${
      values.join(",")
    }`,
    params,
  );
}

async function insertRecipeTags(recipeIds: number[], tagIds: number[]) {
  // First create a mapping of tag names to their IDs
  const tagMap: Record<string, number> = {
    "Vegetarian": tagIds[0],
    "Vegan": tagIds[1],
    "Gluten-Free": tagIds[2],
    "Dairy-Free": tagIds[3],
    "Low-Carb": tagIds[4],
    "High-Protein": tagIds[5],
    "Quick": tagIds[6],
    "Family-Friendly": tagIds[7],
    "Comfort Food": tagIds[8],
    "Healthy": tagIds[9],
  };

  // Define type for recipe-tag relationships using tag names
  type RecipeTag = [
    recipeIndex: number, // Index in recipeIds array
    tagName: string, // Tag name instead of ID
  ];

  const recipeTags: RecipeTag[] = [
    // Spaghetti Carbonara (first recipe)
    [0, "Vegetarian"],
    [0, "Comfort Food"],
    // Chocolate Chip Cookies (second recipe)
    [1, "Vegetarian"],
    [1, "Family-Friendly"],
    // Avocado Toast (third recipe)
    [2, "Vegan"],
    [2, "Quick"],
    [2, "Healthy"],
    // Chicken Stir Fry (fourth recipe)
    [3, "Quick"],
    [3, "Family-Friendly"],
    [3, "Healthy"],
    // Banana Oatmeal Pancakes (fifth recipe)
    [4, "Vegetarian"],
    [4, "Healthy"],
    // Quinoa Salad Bowl (sixth recipe)
    [5, "Vegan"],
    [5, "Healthy"],
    // Vegan Chocolate Mousse (seventh recipe)
    [6, "Vegan"],
    [6, "Comfort Food"],
  ];

  // Prepare the query with parameterized values
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const rt of recipeTags) {
    const [recipeIndex, tagName] = rt;
    const tagId = tagMap[tagName];

    if (tagId === undefined) {
      throw new Error(`Unknown tag name: ${tagName}`);
    }

    // Validate recipe index
    if (recipeIndex < 0 || recipeIndex >= recipeIds.length) {
      throw new Error(`Invalid recipe index: ${recipeIndex}`);
    }

    values.push(`($${paramIndex}, $${paramIndex + 1})`);
    params.push(recipeIds[recipeIndex], tagId);
    paramIndex += 2;
  }

  await client.queryArray(
    `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ${values.join(",")}`,
    params,
  );
}

async function insertRecipeIngredients(
  recipeIds: number[],
  ingredientIds: number[],
) {
  const ingredientMap = createIngredientMap(ingredientNames, ingredientIds);

  type RecipeIngredient = [
    recipeIndex: number,
    ingredientName: string,
    quantity: number,
    unit: string | null,
    notes: string | null,
    sortOrder: number,
  ];

  const recipeIngredients: RecipeIngredient[] = [
    // Spaghetti Carbonara
    [0, "Pasta", 400, "g", "Spaghetti", 1],
    [0, "Chicken breast", 150, "g", "Pancetta or guanciale", 2],
    [0, "Eggs", 3, null, "Large eggs", 3],
    [0, "Parmesan cheese", 50, "g", "Grated", 4],
    [0, "Salt", 1, "tsp", null, 5],
    [0, "Black pepper", 0.5, "tsp", "Freshly ground", 6],
    // Chocolate Chip Cookies
    [1, "All-purpose flour", 250, "g", null, 1],
    [1, "Sugar", 200, "g", null, 2],
    [1, "Butter", 150, "g", "Softened", 3],
    [1, "Eggs", 1, null, null, 4],
    [1, "Baking powder", 1, "tsp", null, 5],
    [1, "Vanilla extract", 1, "tsp", null, 6],
    [1, "Salt", 0.5, "tsp", null, 7],
    [1, "Chocolate chips", 200, "g", null, 8],
    // Avocado Toast
    [2, "Avocado", 1, null, "Ripe", 1],
    [2, "Salt", 1, "pinch", null, 2],
    [2, "Black pepper", 1, "pinch", null, 3],
    [2, "Lime", 0.5, null, "Juiced", 4],
    [2, "Cilantro", 1, "tbsp", "Chopped", 5],
    [2, "All-purpose flour", 1, "slice", "Whole grain bread", 6],
    // Chicken Stir Fry
    [3, "Chicken breast", 2, null, "Breasts, sliced", 1],
    [3, "Olive oil", 2, "tbsp", null, 2],
    [3, "Garlic", 2, "cloves", "Minced", 3],
    [3, "Onion", 1, null, "Diced", 4],
    [3, "Tomato", 2, null, "Diced", 5],
    [3, "Salt", 1, "tsp", null, 6],
    [3, "Black pepper", 0.5, "tsp", null, 7],
    // Banana Oatmeal Pancakes
    [4, "Banana", 2, null, "Ripe", 1],
    [4, "Eggs", 2, null, null, 2],
    [4, "Oats", 100, "g", null, 3],
    [4, "Almond milk", 120, "ml", null, 4],
    [4, "Cinnamon", 1, "tsp", null, 5],
    [4, "Vanilla extract", 1, "tsp", null, 6],
    // Quinoa Salad Bowl
    [5, "Quinoa", 100, "g", "Cooked", 1],
    [5, "Tomato", 1, null, "Diced", 2],
    [5, "Avocado", 0.5, null, "Diced", 3],
    [5, "Cilantro", 2, "tbsp", "Chopped", 4],
    [5, "Lime", 1, null, "Juiced", 5],
    [5, "Olive oil", 2, "tbsp", null, 6],
    [5, "Salt", 0.5, "tsp", null, 7],
    // Vegan Chocolate Mousse
    [6, "Chocolate chips", 200, "g", "Dark vegan chocolate", 1],
    [6, "Almond milk", 200, "ml", "Chilled", 2],
    [6, "Sugar", 2, "tbsp", null, 3],
    [6, "Vanilla extract", 1, "tsp", null, 4],
  ];

  for (const ri of recipeIngredients) {
    const [recipeIndex, ingredientName, quantity, unit, notes, sortOrder] = ri;
    const ingredientId = ingredientMap[ingredientName];
    await client.queryArray(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes, sort_order) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
      [recipeIds[recipeIndex], ingredientId, quantity, unit, notes, sortOrder],
    );
  }
}

async function insertInstructions(recipeIds: number[]) {
  type Instructions = [
    recipeIndex: number,
    stepNumber: number,
    instrucionText: string,
    imagePath: string | null,
  ];

  const instructions: Instructions[] = [
    // Spaghetti Carbonara
    [
      0,
      1,
      "Bring a large pot of salted water to boil and cook spaghetti according to package instructions.",
      null,
    ],
    [
      0,
      2,
      "While pasta cooks, heat a large skillet over medium heat. Add pancetta and cook until crispy.",
      null,
    ],
    [
      0,
      3,
      "In a bowl, whisk eggs and grated cheese together with black pepper.",
      null,
    ],
    [
      0,
      4,
      "Drain pasta, reserving 1/2 cup of pasta water. Quickly add hot pasta to the skillet with pancetta.",
      null,
    ],
    [
      0,
      5,
      "Remove from heat and quickly stir in egg mixture, adding pasta water as needed to create a creamy sauce.",
      null,
    ],
    [
      0,
      6,
      "Serve immediately with extra grated cheese and black pepper.",
      null,
    ],
    // Chocolate Chip Cookies
    [
      1,
      1,
      "Preheat oven to 350°F (180°C) and line baking sheets with parchment paper.",
      null,
    ],
    [
      1,
      2,
      "In a large bowl, cream together butter and sugars until light and fluffy.",
      null,
    ],
    [1, 3, "Beat in egg and vanilla until well combined.", null],
    [
      1,
      4,
      "In another bowl, whisk together flour, baking powder, and salt.",
      null,
    ],
    [
      1,
      5,
      "Gradually add dry ingredients to wet ingredients, mixing until just combined.",
      null,
    ],
    [1, 6, "Fold in chocolate chips.", null],
    [
      1,
      7,
      "Drop tablespoon-sized balls of dough onto prepared baking sheets.",
      null,
    ],
    [
      1,
      8,
      "Bake for 10-12 minutes until edges are golden but centers are still soft.",
      null,
    ],
    [
      1,
      9,
      "Let cool on baking sheets for 5 minutes before transferring to wire racks.",
      null,
    ],
    // Avocado Toast
    [2, 1, "Toast bread to desired crispness.", null],
    [
      2,
      2,
      "Cut avocado in half, remove pit, and scoop flesh into a bowl.",
      null,
    ],
    [
      2,
      3,
      "Add lime juice, salt, and pepper. Mash with a fork to desired consistency.",
      null,
    ],
    [
      2,
      4,
      "Spread avocado mixture on toast and sprinkle with chili flakes and cilantro.",
      null,
    ],
    // Chicken Stir Fry
    [3, 1, "Heat oil in a large wok or skillet over high heat.", null],
    [
      3,
      2,
      "Add chicken and stir-fry for 5-6 minutes until cooked through. Remove and set aside.",
      null,
    ],
    [
      3,
      3,
      "Add garlic and onion to the wok, stir-fry for 1 minute until fragrant.",
      null,
    ],
    [3, 4, "Add tomatoes and cook for 2 minutes until softened.", null],
    [
      3,
      5,
      "Return chicken to wok, season with salt and pepper, and toss everything together.",
      null,
    ],
    [3, 6, "Serve hot over rice or noodles.", null],
    // Banana Oatmeal Pancakes
    [
      4,
      1,
      "In a blender, combine all ingredients and blend until smooth.",
      null,
    ],
    [
      4,
      2,
      "Heat a non-stick skillet over medium heat and lightly grease with oil or butter.",
      null,
    ],
    [4, 3, "Pour 1/4 cup batter for each pancake onto the skillet.", null],
    [
      4,
      4,
      "Cook until bubbles form on the surface, then flip and cook the other side until golden.",
      null,
    ],
    [4, 5, "Serve with maple syrup and fresh fruit.", null],
    // Quinoa Salad Bowl
    [
      5,
      1,
      "Cook quinoa according to package instructions, then let cool.",
      null,
    ],
    [
      5,
      2,
      "In a large bowl, combine cooled quinoa with diced vegetables.",
      null,
    ],
    [
      5,
      3,
      "In a small bowl, whisk together lime juice, olive oil, salt, and pepper.",
      null,
    ],
    [5, 4, "Pour dressing over quinoa mixture and toss to combine.", null],
    [5, 5, "Garnish with fresh cilantro before serving.", null],
    // Vegan Chocolate Mousse
    [
      6,
      1,
      "Melt chocolate in a heatproof bowl set over simmering water, then let cool slightly.",
      null,
    ],
    [
      6,
      2,
      "In a chilled bowl, whip almond milk until soft peaks form.",
      null,
    ],
    [6, 3, "Gently fold melted chocolate into whipped almond milk.", null],
    [
      6,
      4,
      "Divide mixture among serving glasses and refrigerate for at least 2 hours.",
      null,
    ],
    [6, 5, "Serve chilled, garnished with berries if desired.", null],
  ];

  for (const instr of instructions) {
    const [recipeIndex, stepNumber, instructionText, imagePath] = instr;

    await client.queryArray(
      `INSERT INTO instructions (recipe_id, step_number, instruction_text, image_path) 
                 VALUES ($1, $2, $3, $4)`,
      [recipeIds[recipeIndex], stepNumber, instructionText, imagePath],
    );
  }
}

async function insertRecipeImages(recipeIds: number[]) {
  // Define type for recipe images
  type RecipeImage = [
    recipeIndex: number, // Index in recipeIds array
    imagePath: string,
    caption: string | null,
    isPrimary: boolean,
    sortOrder: number,
  ];

  const recipeImages: RecipeImage[] = [
    // Spaghetti Carbonara (first recipe)
    [0, "/images/carbonara1.jpg", "Finished dish with grated cheese", true, 1],
    [0, "/images/carbonara2.jpg", "Close-up of creamy sauce", false, 2],
    // Chocolate Chip Cookies (second recipe)
    [1, "/images/cookies1.jpg", "Freshly baked cookies on rack", true, 1],
    [
      1,
      "/images/cookies2.jpg",
      "Cookie dough balls ready for baking",
      false,
      2,
    ],
    // Avocado Toast (third recipe)
    [2, "/images/avocado1.jpg", "Toast with avocado spread", true, 1],
    // Chicken Stir Fry (fourth recipe)
    [3, "/images/stirfry1.jpg", "Chicken and vegetables in wok", true, 1],
    // Banana Oatmeal Pancakes (fifth recipe)
    [4, "/images/pancakes1.jpg", "Stack of pancakes with syrup", true, 1],
    // Quinoa Salad Bowl (sixth recipe)
    [5, "/images/quinoa1.jpg", "Colorful quinoa bowl", true, 1],
    // Vegan Chocolate Mousse (seventh recipe)
    [6, "/images/mousse1.jpg", "Chocolate mousse in glasses", true, 1],
  ];

  // Prepare the query with parameterized values
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const img of recipeImages) {
    const [recipeIndex, imagePath, caption, isPrimary, sortOrder] = img;

    // Validate recipe index
    if (recipeIndex < 0 || recipeIndex >= recipeIds.length) {
      throw new Error(`Invalid recipe index: ${recipeIndex}`);
    }

    values.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${
        paramIndex + 3
      }, $${paramIndex + 4})`,
    );
    params.push(
      recipeIds[recipeIndex],
      imagePath,
      caption,
      isPrimary,
      sortOrder,
    );
    paramIndex += 5;
  }

  await client.queryArray(
    `INSERT INTO recipe_images (recipe_id, image_path, caption, is_primary, sort_order) VALUES 
     ${values.join(",")}`,
    params,
  );
}

async function insertUserFavorites(userIds: number[], recipeIds: number[]) {
  // Destructure the userIds array to named variables
  const [johnId, maryId, daveId, sarahId] = userIds;

  // Define type for user favorites
  type UserFavorite = [
    userIndex: number, // Index in userIds array
    recipeIndex: number, // Index in recipeIds array
    createdAt: string,
  ];

  const userFavorites: UserFavorite[] = [
    // Mary favorites Spaghetti Carbonara (recipe 0)
    [1, 0, "2023-02-01 12:00:00"],
    // Dave favorites Chocolate Chip Cookies (recipe 1)
    [2, 1, "2023-03-15 14:30:00"],
    // Sarah favorites Avocado Toast (recipe 2)
    [3, 2, "2023-04-10 09:15:00"],
    // John favorites Chicken Stir Fry (recipe 3)
    [0, 3, "2023-05-05 18:45:00"],
    // Mary favorites Banana Oatmeal Pancakes (recipe 4)
    [1, 4, "2023-05-20 08:00:00"],
    // Dave favorites Quinoa Salad Bowl (recipe 5)
    [2, 5, "2023-06-05 12:30:00"],
    // Sarah favorites Vegan Chocolate Mousse (recipe 6)
    [3, 6, "2023-06-10 20:15:00"],
  ];

  // Prepare the query with parameterized values
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const uf of userFavorites) {
    const [userIndex, recipeIndex, createdAt] = uf;

    // Validate indices
    if (userIndex < 0 || userIndex >= userIds.length) {
      throw new Error(`Invalid user index: ${userIndex}`);
    }
    if (recipeIndex < 0 || recipeIndex >= recipeIds.length) {
      throw new Error(`Invalid recipe index: ${recipeIndex}`);
    }

    values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
    params.push(userIds[userIndex], recipeIds[recipeIndex], createdAt);
    paramIndex += 3;
  }

  await client.queryArray(
    `INSERT INTO user_favorites (user_id, recipe_id, created_at) VALUES ${
      values.join(",")
    }`,
    params,
  );
}

async function insertMealPlans(userIds: number[]): Promise<number[]> {
  // Destructure the userIds array to named variables
  const [johnId, maryId, daveId, sarahId] = userIds;

  // Define type for meal plans
  type MealPlan = [
    userIndex: number,  // Index in userIds array
    planName: string,
    startDate: string,
    endDate: string,
    createdAt: string
  ];

  const mealPlans: MealPlan[] = [
    // John's meal plan
    [0, 'Week 1 Meal Prep', '2023-06-05', '2023-06-11', '2023-06-01 10:00:00'],
    // Mary's meal plan
    [1, 'Summer Healthy Eating', '2023-06-12', '2023-06-18', '2023-06-10 15:30:00'],
    // Dave's meal plan
    [2, 'Vegan Challenge Week', '2023-06-19', '2023-06-25', '2023-06-15 12:00:00']
  ];

  const planIds: number[] = [];

  // Insert meal plans one by one to capture their IDs
  for (const mp of mealPlans) {
    const [userIndex, planName, startDate, endDate, createdAt] = mp;

    // Validate user index
    if (userIndex < 0 || userIndex >= userIds.length) {
      throw new Error(`Invalid user index: ${userIndex}`);
    }

    const result = await client.queryArray<[number]>(
      `INSERT INTO meal_plans (user_id, plan_name, start_date, end_date, created_at) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING plan_id`,
      [
        userIds[userIndex],
        planName,
        startDate,
        endDate,
        createdAt
      ]
    );

    if (!result.rows[0]?.[0]) {
      throw new Error(`No plan_id returned for meal plan: ${planName}`);
    }
    planIds.push(result.rows[0][0]);
  }

  return planIds;
}

async function insertMealPlanRecipes(mealPlanIds: number[], recipeIds: number[]) {
  // Define type for meal plan recipes
  type MealPlanRecipe = [
    planIndex: number,  // Index in mealPlanIds array
    recipeIndex: number,  // Index in recipeIds array
    mealType: string,
    planDate: string,
    notes: string | null
  ];

  const mealPlanRecipes: MealPlanRecipe[] = [
    // Week 1 Meal Prep (plan 0)
    [0, 4, 'Breakfast', '2023-06-05', 'Make extra batter for next day'],
    [0, 5, 'Lunch', '2023-06-05', 'Prep quinoa in advance'],
    [0, 0, 'Dinner', '2023-06-05', null],
    [0, 4, 'Breakfast', '2023-06-06', null],
    [0, 3, 'Dinner', '2023-06-06', 'Use leftover chicken'],
    // Summer Healthy Eating (plan 1)
    [1, 2, 'Breakfast', '2023-06-12', 'Add cherry tomatoes'],
    [1, 5, 'Lunch', '2023-06-12', null],
    [1, 6, 'Dinner', '2023-06-12', 'Serve with fresh berries'],
    // Vegan Challenge Week (plan 2)
    [2, 2, 'Breakfast', '2023-06-19', null],
    [2, 5, 'Lunch', '2023-06-19', 'Add extra veggies'],
    [2, 6, 'Dinner', '2023-06-19', 'Make double for dessert tomorrow']
  ];

  // Prepare the query with parameterized values
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const mpr of mealPlanRecipes) {
    const [planIndex, recipeIndex, mealType, planDate, notes] = mpr;

    // Validate indices
    if (planIndex < 0 || planIndex >= mealPlanIds.length) {
      throw new Error(`Invalid meal plan index: ${planIndex}`);
    }
    if (recipeIndex < 0 || recipeIndex >= recipeIds.length) {
      throw new Error(`Invalid recipe index: ${recipeIndex}`);
    }

    values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4})`);
    params.push(
      mealPlanIds[planIndex],
      recipeIds[recipeIndex],
      mealType,
      planDate,
      notes
    );
    paramIndex += 5;
  }

  await client.queryArray(
    `INSERT INTO meal_plan_recipes (plan_id, recipe_id, meal_type, plan_date, notes) VALUES ${
      values.join(",")
    }`,
    params
  );
}

async function insertReviews(userIds: number[], recipeIds: number[]) {
  // Destructure the userIds array to named variables
  const [johnId, maryId, daveId, sarahId] = userIds;

  // Define type for reviews
  type Review = [
    userIndex: number,  // Index in userIds array
    recipeIndex: number,  // Index in recipeIds array
    rating: number,
    comment: string,
    createdAt: string
  ];

  const reviews: Review[] = [
    // Mary reviews Spaghetti Carbonara (recipe 0)
    [1, 0, 5, 'Absolutely delicious! The perfect carbonara recipe.', '2023-02-05 19:30:00'],
    // Dave reviews Spaghetti Carbonara (recipe 0)
    [2, 0, 4, 'Great recipe, though I added some peas for color.', '2023-03-01 13:45:00'],
    // Sarah reviews Chocolate Chip Cookies (recipe 1)
    [3, 1, 5, 'My family loves these cookies! Perfect texture.', '2023-04-18 15:20:00'],
    // John reviews Avocado Toast (recipe 2)
    [0, 2, 4, 'Simple and healthy breakfast option.', '2023-05-22 08:30:00'],
    // Dave reviews Chicken Stir Fry (recipe 3)
    [2, 3, 5, 'Quick and flavorful - perfect for busy weeknights!', '2023-06-08 19:00:00'],
    // Sarah reviews Banana Oatmeal Pancakes (recipe 4)
    [3, 4, 4, 'Healthy pancakes that actually taste good!', '2023-06-15 09:45:00'],
    // Mary reviews Quinoa Salad Bowl (recipe 5)
    [1, 5, 5, 'This quinoa bowl is my new lunch staple.', '2023-06-18 12:15:00'],
    // John reviews Vegan Chocolate Mousse (recipe 6)
    [0, 6, 5, 'Can\'t believe this mousse is vegan - so rich!', '2023-06-20 21:00:00']
  ];

  // Prepare the query with parameterized values
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const review of reviews) {
    const [userIndex, recipeIndex, rating, comment, createdAt] = review;

    // Validate indices
    if (userIndex < 0 || userIndex >= userIds.length) {
      throw new Error(`Invalid user index: ${userIndex}`);
    }
    if (recipeIndex < 0 || recipeIndex >= recipeIds.length) {
      throw new Error(`Invalid recipe index: ${recipeIndex}`);
    }

    values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4})`);
    params.push(
      userIds[userIndex],
      recipeIds[recipeIndex],
      rating,
      comment,
      createdAt
    );
    paramIndex += 5;
  }

  await client.queryArray(
    `INSERT INTO reviews (user_id, recipe_id, rating, comment, created_at) VALUES ${
      values.join(",")
    }`,
    params
  );
}

async function insertShoppingList(userIds: number[]): Promise<number[]> {
  // Destructure the userIds array to named variables
  const [johnId, maryId, daveId, sarahId] = userIds;

  // Define type for shopping lists
  type ShoppingList = [
    userIndex: number,  // Index in userIds array
    listName: string,
    createdAt: string,
    updatedAt: string,
    isActive: boolean
  ];

  const shoppingLists: ShoppingList[] = [
    // John's shopping list
    [0, 'Weekly Groceries', '2023-06-10 09:00:00', '2023-06-15 10:30:00', true],
    // Mary's shopping list
    [1, 'BBQ Party Supplies', '2023-06-12 14:00:00', '2023-06-17 16:45:00', true],
    // Dave's shopping list
    [2, 'Vegan Meal Prep', '2023-06-15 11:30:00', '2023-06-18 12:15:00', true],
    // Sarah's shopping list
    [3, 'Baking Essentials', '2023-06-18 18:00:00', '2023-06-20 09:20:00', false]
  ];

  const shoppingListIds: number[] = [];

  // Insert shopping lists one by one to capture their IDs
  for (const sl of shoppingLists) {
    const [userIndex, listName, createdAt, updatedAt, isActive] = sl;

    // Validate user index
    if (userIndex < 0 || userIndex >= userIds.length) {
      throw new Error(`Invalid user index: ${userIndex}`);
    }

    const result = await client.queryArray<[number]>(
      `INSERT INTO shopping_lists (list_name, author_id, created_at, updated_at, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING list_id`,  // Assuming the primary key is 'id'
      [
        listName,
        userIds[userIndex],
        createdAt,
        updatedAt,
        isActive
      ]
    );

    if (!result.rows[0]?.[0]) {
      throw new Error(`No ID returned for shopping list: ${listName}`);
    }
    shoppingListIds.push(result.rows[0][0]);
  }

  return shoppingListIds;
}

async function insertGenericShoppingListItems(): Promise<number[]> {
  // Define type for generic shopping items
  type GenericItem = [
    itemName: string,
    description: string,
    itemType: string
  ];

  const genericItems: GenericItem[] = [
    ['Paper towels', '2-ply strong', 'generic'],
    ['Dish soap', 'Lemon scent', 'generic'],
    ['Aluminum foil', 'Heavy duty', 'generic'],
    ['Garbage bags', 'Large 30 gallon', 'generic'],
    ['BBQ charcoal', 'Natural lump', 'generic']
  ];

  const itemIds: number[] = [];

  // Insert items one by one to capture their IDs
  for (const item of genericItems) {
    const [itemName, description, itemType] = item;

    const result = await client.queryArray<[number]>(
      `INSERT INTO shopping_items (item_name, description, item_type) 
       VALUES ($1, $2, $3) 
       RETURNING item_id`,
      [itemName, description, itemType]
    );

    if (!result.rows[0]?.[0]) {
      throw new Error(`No ID returned for item: ${itemName}`);
    }
    itemIds.push(result.rows[0][0]);
  }

  return itemIds;
}

async function insertLinkedShoppingListItems(ingredientIds: number[]): Promise<number[]> {
  // Create the ingredient map using your existing function
  const ingredientMap = createIngredientMap(ingredientNames, ingredientIds);

  // Define the linked items we want to insert
  const linkedItems = [
    { name: "Eggs", ingredientName: "Eggs" },
    { name: "Milk", ingredientName: "Milk" },
    { name: "Chicken breast", ingredientName: "Chicken breast" },
    { name: "Olive oil", ingredientName: "Olive oil" },
    { name: "Banana", ingredientName: "Banana" },
    { name: "Avocado", ingredientName: "Avocado" },
    { name: "Quinoa", ingredientName: "Quinoa" },
    { name: "Chocolate chips", ingredientName: "Chocolate chips" }
  ];

  const shoppingItemIds: number[] = [];

  for (const item of linkedItems) {
    const ingredientId = ingredientMap[item.ingredientName];
    
    if (ingredientId === undefined) {
      console.warn(`Skipping unknown ingredient: ${item.ingredientName}`);
      continue;
    }

    try {
      const result = await client.queryArray<[number]>(
        `INSERT INTO shopping_items (item_name, item_type, ingredient_id)
         VALUES ($1, 'ingredient', $2)
         ON CONFLICT (ingredient_id) WHERE ingredient_id IS NOT NULL DO NOTHING
         RETURNING item_id`,
        [item.name, ingredientId]
      );

      if (result.rows[0]?.[0]) {
        shoppingItemIds.push(result.rows[0][0]);
      }
    } catch (error) {
      console.error(`Error inserting shopping item ${item.name}:`, error);
      throw error;
    }
  }

  return shoppingItemIds;
}

async function insertShoppingListItems(
  shoppingListIds: number[],
  shoppingItemIds: number[],
  userIds: number[],
  recipeIds: number[]
): Promise<void> {
  try {
    // 1. First get all existing shopping items from the database
    const itemsResult = await client.queryArray<[number, string, number | null]>(
      "SELECT item_id, item_name, ingredient_id FROM shopping_items"
    );
    
    // 2. Create comprehensive mappings for item lookup
    const itemNameToId: Record<string, number> = {};
    const ingredientIdToItemId: Record<number, number> = {};
    
    for (const row of itemsResult.rows) {
      const [id, name, ingredientId] = row;
      itemNameToId[name] = id;
      if (ingredientId !== null) {
        ingredientIdToItemId[ingredientId] = id;
      }
    }

    // 3. Get all ingredients for fallback lookup
    const ingredientsResult = await client.queryArray<[number, string]>(
      "SELECT ingredient_id, name FROM ingredients ORDER BY ingredient_id"
    );
    const ingredientNameToId: Record<string, number> = {};
    for (const row of ingredientsResult.rows) {
      ingredientNameToId[row[1]] = row[0];
    }

    // 4. Define shopping list items data
    type ShoppingListItem = [
      listIndex: number,     // Index in shoppingListIds array
      itemName: string,
      quantity: number,
      unit: string | null,
      isChecked: boolean,
      addedByIndex: number,  // Index in userIds array
      addedAt: string,
      checkedByIndex: number | null,
      checkedAt: string | null,
      sortOrder: number,
      notes: string | null,
      recipeIndex: number | null  // Index in recipeIds array
    ];

    const shoppingListItems: ShoppingListItem[] = [
      // Weekly Groceries (list 0)
      [0, "Eggs", 12, null, false, 0, "2023-06-10 09:05:00", null, null, 1, "Large brown eggs", null],
      [0, "Milk", 1, "gallon", false, 0, "2023-06-10 09:05:00", null, null, 2, "Whole milk", null],
      [0, "Paper towels", 1, null, true, 0, "2023-06-10 09:06:00", 0, "2023-06-12 16:30:00", 3, "Bulk pack", null],
      [0, "Chicken breast", 4, null, false, 0, "2023-06-11 18:30:00", null, null, 4, "For stir fry", 3],
      [0, "Olive oil", 1, "bottle", false, 0, "2023-06-11 18:31:00", null, null, 5, "Extra virgin", null],
      
      // BBQ Party Supplies (list 1)
      [1, "BBQ charcoal", 1, "bag", false, 1, "2023-06-12 14:05:00", null, null, 1, null, null],
      [1, "Chicken breast", 6, null, false, 1, "2023-06-12 14:06:00", null, null, 2, "For skewers", null],
      [1, "Aluminum foil", 1, "roll", true, 1, "2023-06-12 14:07:00", 1, "2023-06-16 12:00:00", 3, "Heavy duty", null],
      [1, "Banana", 6, null, false, 1, "2023-06-13 10:00:00", null, null, 4, "For banana pudding", 1],
      [1, "Chocolate chips", 1, "bag", false, 1, "2023-06-13 10:01:00", null, null, 5, null, 1],
      
      // Vegan Meal Prep (list 2)
      [2, "Avocado", 4, null, false, 2, "2023-06-15 11:35:00", null, null, 1, "For toast and salad", 2],
      [2, "Quinoa", 1, "bag", false, 2, "2023-06-15 11:36:00", null, null, 2, "Organic if possible", 5],
      [2, "Dish soap", 1, null, false, 2, "2023-06-15 11:37:00", null, null, 3, null, null],
      
      // Baking Essentials (list 3)
      [3, "Eggs", 6, null, false, 3, "2023-06-18 18:05:00", null, null, 1, null, null],
      [3, "Milk", 0.5, "gallon", false, 3, "2023-06-18 18:06:00", null, null, 2, null, null],
      [3, "Chocolate chips", 2, "bags", true, 3, "2023-06-18 18:07:00", 3, "2023-06-19 14:00:00", 3, "Dark and milk", 1],
      [3, "Garbage bags", 1, null, false, 3, "2023-06-19 09:00:00", null, null, 4, "For cleanup", null]
    ];

    // 5. Prepare the query with parameterized values
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    let skippedItems = 0;

    for (const item of shoppingListItems) {
      const [
        listIndex, 
        itemName, 
        quantity, 
        unit, 
        isChecked, 
        addedByIndex, 
        addedAt, 
        checkedByIndex, 
        checkedAt, 
        sortOrder, 
        notes, 
        recipeIndex
      ] = item;

      // Validate indices
      if (listIndex < 0 || listIndex >= shoppingListIds.length) {
        throw new Error(`Invalid shopping list index: ${listIndex} (max ${shoppingListIds.length-1})`);
      }
      if (addedByIndex < 0 || addedByIndex >= userIds.length) {
        throw new Error(`Invalid added_by user index: ${addedByIndex} (max ${userIds.length-1})`);
      }
      if (checkedByIndex !== null && (checkedByIndex < 0 || checkedByIndex >= userIds.length)) {
        throw new Error(`Invalid checked_by user index: ${checkedByIndex} (max ${userIds.length-1})`);
      }
      if (recipeIndex !== null && (recipeIndex < 0 || recipeIndex >= recipeIds.length)) {
        throw new Error(`Invalid recipe index: ${recipeIndex} (max ${recipeIds.length-1})`);
      }

      // Find item ID - try direct name match first
      let itemId = itemNameToId[itemName];
      
      // If not found by name, try to find by ingredient name
      if (itemId === undefined) {
        const ingredientId = ingredientNameToId[itemName];
        if (ingredientId !== undefined) {
          itemId = ingredientIdToItemId[ingredientId];
        }
      }

      if (itemId === undefined) {
        console.warn(`Skipping unknown shopping item: ${itemName}`);
        skippedItems++;
        continue;
      }

      values.push(`(
        $${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, 
        $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, 
        $${paramIndex+8}, $${paramIndex+9}, $${paramIndex+10}, $${paramIndex+11}
      )`);
      
      params.push(
        shoppingListIds[listIndex],
        itemId,
        quantity,
        unit,
        isChecked,
        userIds[addedByIndex],
        addedAt,
        checkedByIndex !== null ? userIds[checkedByIndex] : null,
        checkedAt,
        sortOrder,
        notes,
        recipeIndex !== null ? recipeIds[recipeIndex] : null
      );
      
      paramIndex += 12;
    }

    // 6. Only execute if we have items to insert
    if (values.length > 0) {
      await client.queryArray(
        `INSERT INTO shopping_list_items (
          list_id, item_id, quantity, unit, is_checked, added_by, 
          added_at, checked_by, checked_at, sort_order, notes, source_recipe_id
        ) VALUES ${values.join(",")}`,
        params
      );
      console.log(`Inserted ${values.length} shopping list items (skipped ${skippedItems})`);
    } else if (skippedItems > 0) {
      throw new Error("All shopping list items were skipped due to missing references");
    }
  } catch (error) {
    console.error("Failed to insert shopping list items:", error);
    throw error;
  }
}

async function insertShoppingListContributors(
  shoppingListIds: number[],
  userIds: number[]
): Promise<void> {
  // Destructure IDs for readability
  const [johnId, maryId, daveId, sarahId] = userIds;
  const [weeklyGroceriesId, bbqPartyId, veganMealId, bakingEssentialsId] = shoppingListIds;

  // Define type for shopping list contributors
  type ShoppingListContributor = [
    listIndex: number,     // Index in shoppingListIds array
    userIndex: number,     // Index in userIds array
    canEdit: boolean,
    addedAt: string,
    addedByIndex: number   // Index in userIds array
  ];

  const contributors: ShoppingListContributor[] = [
    // Weekly Groceries contributors (list 0)
    [0, 1, true, '2023-06-10 10:00:00', 0],  // Mary added by John
    [0, 3, false, '2023-06-10 10:01:00', 0], // Sarah added by John
    
    // BBQ Party Supplies contributors (list 1)
    [1, 0, true, '2023-06-12 15:00:00', 1],  // John added by Mary
    [1, 2, true, '2023-06-12 15:01:00', 1],  // Dave added by Mary
    
    // Vegan Meal Prep contributors (list 2)
    [2, 3, false, '2023-06-15 12:00:00', 2], // Sarah added by Dave
    
    // Baking Essentials contributors (list 3)
    [3, 1, true, '2023-06-18 19:00:00', 3]   // Mary added by Sarah
  ];

  // Prepare the query with parameterized values
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const contributor of contributors) {
    const [listIndex, userIndex, canEdit, addedAt, addedByIndex] = contributor;

    // Validate indices
    if (listIndex < 0 || listIndex >= shoppingListIds.length) {
      throw new Error(`Invalid shopping list index: ${listIndex}`);
    }
    if (userIndex < 0 || userIndex >= userIds.length) {
      throw new Error(`Invalid user index: ${userIndex}`);
    }
    if (addedByIndex < 0 || addedByIndex >= userIds.length) {
      throw new Error(`Invalid added_by user index: ${addedByIndex}`);
    }

    values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4})`);
    params.push(
      shoppingListIds[listIndex],
      userIds[userIndex],
      canEdit,
      addedAt,
      userIds[addedByIndex]
    );
    paramIndex += 5;
  }

  await client.queryArray(
    `INSERT INTO shopping_list_contributors (list_id, user_id, can_edit, added_at, added_by) 
     VALUES ${values.join(",")}`,
    params
  );
}

const ingredientNames = [
  "All-purpose flour",
  "Eggs",
  "Milk",
  "Butter",
  "Sugar",
  "Salt",
  "Black pepper",
  "Chicken breast",
  "Olive oil",
  "Garlic",
  "Onion",
  "Tomato",
  "Basil",
  "Pasta",
  "Parmesan cheese",
  "Chocolate chips",
  "Baking powder",
  "Vanilla extract",
  "Avocado",
  "Lime",
  "Cilantro",
  "Quinoa",
  "Almond milk",
  "Banana",
  "Oats",
  "Honey",
  "Cinnamon",
  "Greek yogurt",
  "Blueberries",
];

async function main() {
  const dummy_data =
    (Deno.env.get("DUMMY_DATA") || env["DUMMY_DATA"]) === "true";
  console.log("Dummy data: " + dummy_data);
  try {
    await createTables();
    if (dummy_data) {
      await insertDummyData();
    }
  } catch (error) {
    console.error("Error inserting data:", error);
  } finally {
    // Close the database connection
    await client.end();
  }
}

main();
