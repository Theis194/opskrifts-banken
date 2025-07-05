import { Http } from "./banken/server/wrapper.ts";
import { getAddRecipe, getIndex, getRecipePage, getRecipesPage, searchRecipes, getAllRecipesPage, getMyLists } from "./banken/server/routes/get.ts";
import { postCreateUser, postLogin, postLogout, postNewRecipe } from "./banken/server/api/post.ts";
import { getAdmin, getAdminAddRecipe, getCreateUser } from "./banken/server/routes/admingGets.ts";

const server = await Http.create("./banken/public");

server
    .addRoute("GET", "/", getIndex, { requireAuth: false })
    .addRoute("GET", "/recipe", getRecipePage, { requireAuth: false })
    .addRoute("GET", "/all-recipes", getAllRecipesPage, { requireAuth: false })
    .addRoute("GET", "/tilfoj-opskrift", getAddRecipe, {
        requireAuth: true,
        acm: {
            resource: "recipe",
            permission: "read",
        },
    })
    .addRoute("GET", "/my-lists", getMyLists, {
        requireAuth: true,
        acm: {
            resource: "recipe",
            permission: "read",
        },
    })
    .addRoute("POST", "/api/newRecipe", postNewRecipe, {
        requireAuth: true,
        acm: {
            resource: "recipe",
            permission: "write",
        },
    })
    .addRoute("GET", "/admin", getAdmin, {
        requireAuth: true,
        acm: {
            resource: "admin",
            permission: "read",
        }
    })
    .addRoute("GET", "/admin/recipes/new", getAdminAddRecipe, {
        requireAuth: true,
        acm: {
            resource: "admin",
            permission: "write",
        }
    })
    .addRoute("GET", "/admin/user/new", getCreateUser, {
        requireAuth: true,
        acm: {
            resource: "admin",
            permission: "read",
        }
    })
    .addRoute("GET", "/recipes", getRecipesPage, { requireAuth: false })
    .addRoute("GET", "/recipes/search", searchRecipes, { requireAuth: false })
    .addRoute("POST", "/api/login", postLogin, { requireAuth: false })
    .addRoute("POST", "/api/logout", postLogout, { requireAuth: false })
    .addRoute("POST", "/admin/user/new", postCreateUser, {
        requireAuth: true,
        acm: {
            resource: "admin",
            permission: "write",
        }
    })
    .serve();
