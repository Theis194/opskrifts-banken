import { Client } from "jsr:@db/postgres";

export async function GetRecipes(client: Client, page: number) {
    const query = `
        SELECT
            r.recipe_id AS id,
            r.title,
            r.cover_image_path AS "coverImage",
            r.prep_time AS "prepTime",
            r.cook_time AS "cookTime",
            r.difficulty,
            r.created_at AS "createdAt",
            u.username AS author
        FROM recipes r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.is_public = TRUE
        ORDER BY r.created_at DESC
        LIMIT 12 OFFSET (($1 - 1) * 12)
    `;

    try {
        const result = await client.queryObject<{
            id: number;
            title: string;
            coverImage: string | null;
            prepTime: number;
            cookTime: number;
            difficulty: string;
            createdAt: string;
            author: string;
        }>({
            text: query,
            args: [page]
        });

        return result.rows.map(row => ({
            ...row,
            coverImage: row.coverImage || undefined
        }));
    } catch (error) {
        console.error("Failed to fetch recipes", error);
        throw error;
    }
}


export async function GetPaginatedRecipes(client: Client, page: number) {
    const query = `
        WITH recipe_data AS (
            SELECT 
                r.recipe_id,
                r.title,
                r.cover_image_path,
                r.prep_time,
                r.cook_time,
                r.difficulty,
                r.created_at,
                u.username AS author
            FROM recipes r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.is_public = TRUE
            ORDER BY r.created_at DESC
            LIMIT 12 OFFSET (($1 - 1) * 12)
        )
        SELECT 
            rd.recipe_id AS id,
            rd.title,
            rd.cover_image_path AS "coverImage",
            rd.prep_time AS "prepTime",
            rd.cook_time AS "cookTime",
            rd.difficulty,
            rd.created_at AS "createdAt",
            rd.author,
            (
                SELECT json_agg(json_build_object('name', c.name, 'icon', COALESCE(c.icon_class, '')))
                FROM categories c
                JOIN recipe_categories rc ON c.category_id = rc.category_id
                WHERE rc.recipe_id = rd.recipe_id
            ) AS categories,
            (
                SELECT json_agg(json_build_object('name', t.name, 'color', COALESCE(t.color, '#999999')))
                FROM tags t
                JOIN recipe_tags rt ON t.tag_id = rt.tag_id
                WHERE rt.recipe_id = rd.recipe_id
            ) AS tags
        FROM recipe_data rd;
    `;

    try {
        const result = await client.queryObject<any>({ text: query, args: [page] });

        return result.rows.map(row => ({
            ...row,
            coverImage: row.coverImage || undefined,
            categories: row.categories || [],
            tags: row.tags || []
        }));
    } catch (error) {
        console.error("Failed to fetch paginated recipes", error);
        throw error;
    }
}



export async function SearchRecipes(client: Client, search: string, page: number) {
    const query = `
        SELECT 
            r.recipe_id AS id,
            r.title,
            r.cover_image_path AS "coverImage",
            r.prep_time AS "prepTime",
            r.cook_time AS "cookTime",
            r.difficulty,
            r.created_at AS "createdAt",
            u.username AS author,
            ts_rank(
                setweight(to_tsvector('english', r.title), 'A') || 
                setweight(to_tsvector('english', r.description), 'B'),
                plainto_tsquery('english', $1)
            ) AS rank
        FROM recipes r
        JOIN users u ON r.user_id = u.user_id
        WHERE 
            r.is_public = TRUE AND
            (
                r.title ILIKE '%' || $1 || '%' OR 
                r.description ILIKE '%' || $1 || '%'
            )
        ORDER BY rank DESC, r.created_at DESC
        LIMIT 12 OFFSET (($2 - 1) * 12)
    `;

    try {
        const result = await client.queryObject<{
            id: number;
            title: string;
            coverImage: string | null;
            prepTime: number;
            cookTime: number;
            difficulty: string;
            createdAt: string;
            author: string;
            rank: number;
        }>({
            text: query,
            args: [search, page]
        });

        return result.rows.map(row => ({
            ...row,
            coverImage: row.coverImage || undefined
        }));
    } catch (error) {
        console.error("Failed to perform search", error);
        throw error;
    }
}



export async function TotalRecipesCount(client: Client) {
    const query = `
        SELECT COUNT(*)::int AS total
        FROM recipes
        WHERE is_public = TRUE;
    `;

    try {
        const result = await client.queryObject<{ total: number }>({ text: query });
        return result.rows[0].total;
    } catch (error) {
        console.error("Failed to fetch total recipe count", error);
        throw error;
    }
}

export async function TotalSearchCount(client: Client, search: string) {
    const query = `
        SELECT COUNT(*)::int AS total
        FROM recipes
        WHERE 
            is_public = TRUE AND
            (
                title ILIKE '%' || $1 || '%' OR 
                description ILIKE '%' || $1 || '%'
            );
    `;

    try {
        const result = await client.queryObject<{ total: number }>({
            text: query,
            args: [search]
        });
        return result.rows[0].total;
    } catch (error) {
        console.error("Failed to fetch search result count", error);
        throw error;
    }
}

