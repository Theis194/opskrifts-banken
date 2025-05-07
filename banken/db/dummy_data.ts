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

        // Insert users
        await client.queryArray(
            `INSERT INTO users (username, email, password_hash, created_at, last_login, role) VALUES 
            ($1, $2, $3, $4, $5, $6), 
            ($7, $8, $9, $10, $11, $12), 
            ($13, $14, $15, $16, $17, $18), 
            ($19, $20, $21, $22, $23, $24)`,
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

        // Insert categories
        await client.queryArray(
            `INSERT INTO categories (name, description, icon_class) VALUES 
            ($1, $2, $3), ($4, $5, $6), ($7, $8, $9), ($10, $11, $12), 
            ($13, $14, $15), ($16, $17, $18), ($19, $20, $21)`,
            [
                "Breakfast",
                "Morning meals to start your day",
                "fa-coffee",
                "Lunch",
                "Midday meals for energy",
                "fa-utensils",
                "Dinner",
                "Evening main courses",
                "fa-drumstick-bite",
                "Dessert",
                "Sweet treats and desserts",
                "fa-ice-cream",
                "Vegetarian",
                "Meat-free dishes",
                "fa-leaf",
                "Vegan",
                "Plant-based recipes",
                "fa-seedling",
                "Quick Meals",
                "Recipes under 30 minutes",
                "fa-bolt",
            ],
        );

        // Insert tags
        await client.queryArray(
            `INSERT INTO tags (name, color) VALUES 
            ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10), 
            ($11, $12), ($13, $14), ($15, $16), ($17, $18), ($19, $20)`,
            [
                "Vegetarian",
                "#4CAF50",
                "Vegan",
                "#8BC34A",
                "Gluten-Free",
                "#FFC107",
                "Dairy-Free",
                "#FF9800",
                "Low-Carb",
                "#9C27B0",
                "High-Protein",
                "#2196F3",
                "Quick",
                "#F44336",
                "Family-Friendly",
                "#3F51B5",
                "Comfort Food",
                "#795548",
                "Healthy",
                "#009688",
            ],
        );

        // Insert ingredients
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

        for (const [name, description] of ingredients) {
            await client.queryArray(
                `INSERT INTO ingredients (name, description) VALUES ($1, $2)`,
                [name, description],
            );
        }

        // Insert recipes
        const recipes = [
            [
                1,
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
                2,
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
                3,
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
                4,
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
                1,
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
                2,
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
                3,
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

        for (const recipe of recipes) {
            await client.queryArray(
                `INSERT INTO recipes (user_id, title, description, prep_time, cook_time, servings, difficulty, created_at, updated_at, is_public, cover_image_path) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                recipe,
            );
        }

        // Insert recipe categories
        await client.queryArray(
            `INSERT INTO recipe_categories (recipe_id, category_id) VALUES 
            (1, 3), (1, 5), (2, 4), (3, 1), (3, 5), (3, 6), (4, 3), (4, 7), 
            (5, 1), (5, 5), (6, 2), (6, 5), (6, 6), (7, 4), (7, 6)`,
        );

        // Insert recipe tags
        await client.queryArray(
            `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES 
            (1, 1), (1, 9), (2, 1), (2, 8), (3, 2), (3, 7), (3, 10), 
            (4, 7), (4, 8), (4, 10), (5, 1), (5, 10), (6, 2), (6, 10), (7, 2), (7, 9)`,
        );

        // Insert recipe ingredients
        const recipeIngredients = [
            // Spaghetti Carbonara
            [1, 14, 400, "g", "Spaghetti", 1],
            [1, 8, 150, "g", "Pancetta or guanciale", 2],
            [1, 2, 3, null, "Large eggs", 3],
            [1, 15, 50, "g", "Grated", 4],
            [1, 6, 1, "tsp", null, 5],
            [1, 7, 0.5, "tsp", "Freshly ground", 6],
            // Chocolate Chip Cookies
            [2, 1, 250, "g", null, 1],
            [2, 5, 200, "g", null, 2],
            [2, 4, 150, "g", "Softened", 3],
            [2, 2, 1, null, null, 4],
            [2, 17, 1, "tsp", null, 5],
            [2, 18, 1, "tsp", null, 6],
            [2, 6, 0.5, "tsp", null, 7],
            [2, 16, 200, "g", null, 8],
            // Avocado Toast
            [3, 19, 1, null, "Ripe", 1],
            [3, 6, 1, "pinch", null, 2],
            [3, 7, 1, "pinch", null, 3],
            [3, 20, 0.5, null, "Juiced", 4],
            [3, 21, 1, "tbsp", "Chopped", 5],
            [3, 1, 1, "slice", "Whole grain bread", 6],
            // Chicken Stir Fry
            [4, 8, 2, null, "Breasts, sliced", 1],
            [4, 9, 2, "tbsp", null, 2],
            [4, 10, 2, "cloves", "Minced", 3],
            [4, 11, 1, null, "Diced", 4],
            [4, 12, 2, null, "Diced", 5],
            [4, 6, 1, "tsp", null, 6],
            [4, 7, 0.5, "tsp", null, 7],
            // Banana Oatmeal Pancakes
            [5, 24, 2, null, "Ripe", 1],
            [5, 2, 2, null, null, 2],
            [5, 25, 100, "g", null, 3],
            [5, 23, 120, "ml", null, 4],
            [5, 27, 1, "tsp", null, 5],
            [5, 18, 1, "tsp", null, 6],
            // Quinoa Salad Bowl
            [6, 22, 100, "g", "Cooked", 1],
            [6, 12, 1, null, "Diced", 2],
            [6, 19, 0.5, null, "Diced", 3],
            [6, 21, 2, "tbsp", "Chopped", 4],
            [6, 20, 1, null, "Juiced", 5],
            [6, 9, 2, "tbsp", null, 6],
            [6, 6, 0.5, "tsp", null, 7],
            // Vegan Chocolate Mousse
            [7, 16, 200, "g", "Dark vegan chocolate", 1],
            [7, 23, 200, "ml", "Chilled", 2],
            [7, 5, 2, "tbsp", null, 3],
            [7, 18, 1, "tsp", null, 4],
        ];

        for (const ri of recipeIngredients) {
            await client.queryArray(
                `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes, sort_order) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                ri,
            );
        }

        // Insert instructions
        const instructions = [
            // Spaghetti Carbonara
            [
                1,
                1,
                "Bring a large pot of salted water to boil and cook spaghetti according to package instructions.",
                null,
            ],
            [
                1,
                2,
                "While pasta cooks, heat a large skillet over medium heat. Add pancetta and cook until crispy.",
                null,
            ],
            [
                1,
                3,
                "In a bowl, whisk eggs and grated cheese together with black pepper.",
                null,
            ],
            [
                1,
                4,
                "Drain pasta, reserving 1/2 cup of pasta water. Quickly add hot pasta to the skillet with pancetta.",
                null,
            ],
            [
                1,
                5,
                "Remove from heat and quickly stir in egg mixture, adding pasta water as needed to create a creamy sauce.",
                null,
            ],
            [
                1,
                6,
                "Serve immediately with extra grated cheese and black pepper.",
                null,
            ],
            // Chocolate Chip Cookies
            [
                2,
                1,
                "Preheat oven to 350°F (180°C) and line baking sheets with parchment paper.",
                null,
            ],
            [
                2,
                2,
                "In a large bowl, cream together butter and sugars until light and fluffy.",
                null,
            ],
            [2, 3, "Beat in egg and vanilla until well combined.", null],
            [
                2,
                4,
                "In another bowl, whisk together flour, baking powder, and salt.",
                null,
            ],
            [
                2,
                5,
                "Gradually add dry ingredients to wet ingredients, mixing until just combined.",
                null,
            ],
            [2, 6, "Fold in chocolate chips.", null],
            [
                2,
                7,
                "Drop tablespoon-sized balls of dough onto prepared baking sheets.",
                null,
            ],
            [
                2,
                8,
                "Bake for 10-12 minutes until edges are golden but centers are still soft.",
                null,
            ],
            [
                2,
                9,
                "Let cool on baking sheets for 5 minutes before transferring to wire racks.",
                null,
            ],
            // Avocado Toast
            [3, 1, "Toast bread to desired crispness.", null],
            [
                3,
                2,
                "Cut avocado in half, remove pit, and scoop flesh into a bowl.",
                null,
            ],
            [
                3,
                3,
                "Add lime juice, salt, and pepper. Mash with a fork to desired consistency.",
                null,
            ],
            [
                3,
                4,
                "Spread avocado mixture on toast and sprinkle with chili flakes and cilantro.",
                null,
            ],
            // Chicken Stir Fry
            [4, 1, "Heat oil in a large wok or skillet over high heat.", null],
            [
                4,
                2,
                "Add chicken and stir-fry for 5-6 minutes until cooked through. Remove and set aside.",
                null,
            ],
            [
                4,
                3,
                "Add garlic and onion to the wok, stir-fry for 1 minute until fragrant.",
                null,
            ],
            [4, 4, "Add tomatoes and cook for 2 minutes until softened.", null],
            [
                4,
                5,
                "Return chicken to wok, season with salt and pepper, and toss everything together.",
                null,
            ],
            [4, 6, "Serve hot over rice or noodles.", null],
            // Banana Oatmeal Pancakes
            [
                5,
                1,
                "In a blender, combine all ingredients and blend until smooth.",
                null,
            ],
            [
                5,
                2,
                "Heat a non-stick skillet over medium heat and lightly grease with oil or butter.",
                null,
            ],
            [5, 3, "Pour 1/4 cup batter for each pancake onto the skillet.", null],
            [
                5,
                4,
                "Cook until bubbles form on the surface, then flip and cook the other side until golden.",
                null,
            ],
            [5, 5, "Serve with maple syrup and fresh fruit.", null],
            // Quinoa Salad Bowl
            [
                6,
                1,
                "Cook quinoa according to package instructions, then let cool.",
                null,
            ],
            [
                6,
                2,
                "In a large bowl, combine cooled quinoa with diced vegetables.",
                null,
            ],
            [
                6,
                3,
                "In a small bowl, whisk together lime juice, olive oil, salt, and pepper.",
                null,
            ],
            [6, 4, "Pour dressing over quinoa mixture and toss to combine.", null],
            [6, 5, "Garnish with fresh cilantro before serving.", null],
            // Vegan Chocolate Mousse
            [
                7,
                1,
                "Melt chocolate in a heatproof bowl set over simmering water, then let cool slightly.",
                null,
            ],
            [
                7,
                2,
                "In a chilled bowl, whip almond milk until soft peaks form.",
                null,
            ],
            [7, 3, "Gently fold melted chocolate into whipped almond milk.", null],
            [
                7,
                4,
                "Divide mixture among serving glasses and refrigerate for at least 2 hours.",
                null,
            ],
            [7, 5, "Serve chilled, garnished with berries if desired.", null],
        ];

        for (const instr of instructions) {
            await client.queryArray(
                `INSERT INTO instructions (recipe_id, step_number, instruction_text, image_path) 
                 VALUES ($1, $2, $3, $4)`,
                instr,
            );
        }

        // Insert recipe images
        await client.queryArray(
            `INSERT INTO recipe_images (recipe_id, image_path, caption, is_primary, sort_order) VALUES 
            (1, '/images/carbonara1.jpg', 'Finished dish with grated cheese', true, 1),
            (1, '/images/carbonara2.jpg', 'Close-up of creamy sauce', false, 2),
            (2, '/images/cookies1.jpg', 'Freshly baked cookies on rack', true, 1),
            (2, '/images/cookies2.jpg', 'Cookie dough balls ready for baking', false, 2),
            (3, '/images/avocado1.jpg', 'Toast with avocado spread', true, 1),
            (4, '/images/stirfry1.jpg', 'Chicken and vegetables in wok', true, 1),
            (5, '/images/pancakes1.jpg', 'Stack of pancakes with syrup', true, 1),
            (6, '/images/quinoa1.jpg', 'Colorful quinoa bowl', true, 1),
            (7, '/images/mousse1.jpg', 'Chocolate mousse in glasses', true, 1)`,
        );

        // Insert user favorites
        await client.queryArray(
            `INSERT INTO user_favorites (user_id, recipe_id, created_at) VALUES 
            (2, 1, '2023-02-01 12:00:00'),
            (3, 2, '2023-03-15 14:30:00'),
            (4, 3, '2023-04-10 09:15:00'),
            (1, 4, '2023-05-05 18:45:00'),
            (2, 5, '2023-05-20 08:00:00'),
            (3, 6, '2023-06-05 12:30:00'),
            (4, 7, '2023-06-10 20:15:00')`,
        );

        // Insert reviews
        await client.queryArray(
            `INSERT INTO reviews (user_id, recipe_id, rating, comment, created_at) VALUES 
            (2, 1, 5, 'Absolutely delicious! The perfect carbonara recipe.', '2023-02-05 19:30:00'),
            (3, 1, 4, 'Great recipe, though I added some peas for color.', '2023-03-01 13:45:00'),
            (4, 2, 5, 'My family loves these cookies! Perfect texture.', '2023-04-18 15:20:00'),
            (1, 3, 4, 'Simple and healthy breakfast option.', '2023-05-22 08:30:00'),
            (3, 4, 5, 'Quick and flavorful - perfect for busy weeknights!', '2023-06-08 19:00:00'),
            (4, 5, 4, 'Healthy pancakes that actually taste good!', '2023-06-15 09:45:00'),
            (2, 6, 5, 'This quinoa bowl is my new lunch staple.', '2023-06-18 12:15:00'),
            (1, 7, 5, 'Can''t believe this mousse is vegan - so rich!', '2023-06-20 21:00:00')`,
        );

        // Insert meal plans
        await client.queryArray(
            `INSERT INTO meal_plans (user_id, plan_name, start_date, end_date, created_at) VALUES 
            (1, 'Week 1 Meal Prep', '2023-06-05', '2023-06-11', '2023-06-01 10:00:00'),
            (2, 'Summer Healthy Eating', '2023-06-12', '2023-06-18', '2023-06-10 15:30:00'),
            (3, 'Vegan Challenge Week', '2023-06-19', '2023-06-25', '2023-06-15 12:00:00')`,
        );

        // Insert meal plan recipes
        await client.queryArray(
            `INSERT INTO meal_plan_recipes (plan_id, recipe_id, meal_type, plan_date, notes) VALUES 
            (1, 5, 'Breakfast', '2023-06-05', 'Make extra batter for next day'),
            (1, 6, 'Lunch', '2023-06-05', 'Prep quinoa in advance'),
            (1, 1, 'Dinner', '2023-06-05', NULL),
            (1, 5, 'Breakfast', '2023-06-06', NULL),
            (1, 4, 'Dinner', '2023-06-06', 'Use leftover chicken'),
            (2, 3, 'Breakfast', '2023-06-12', 'Add cherry tomatoes'),
            (2, 6, 'Lunch', '2023-06-12', NULL),
            (2, 7, 'Dinner', '2023-06-12', 'Serve with fresh berries'),
            (3, 3, 'Breakfast', '2023-06-19', NULL),
            (3, 6, 'Lunch', '2023-06-19', 'Add extra veggies'),
            (3, 7, 'Dinner', '2023-06-19', 'Make double for dessert tomorrow')`,
        );

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

async function main() {
    const dummy_data = (Deno.env.get("DUMMY_DATA") || env["DUMMY_DATA"]) === "true";
    console.log("Dummy data: " + dummy_data)
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
