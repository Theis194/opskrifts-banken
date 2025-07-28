import { Http } from "./banken/server/wrapper.ts";
import { getAddRecipe, getIndex, getRecipePage, getRecipesPage, searchRecipes, getAllRecipesPage, getMyLists, getListById, getEditRecipe } from "./banken/server/routes/get.ts";
import { addShoppingItem, createNewShoppingList, postCreateUser, postLogin, postLogout, postNewRecipe, removeShoppingItem, shareListWithUser } from "./banken/server/api/post.ts";
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
            resource: "lists",
            permission: "read",
        },
    })
    .addRoute("GET", "/list", getListById, {
        requireAuth: true,
        acm: {
            resource: "lists",
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
    .addRoute("GET", "/admin/recipes/edit", getEditRecipe, {
        requireAuth: true,
        acm: {
            resource: "admin",
            permission: "write",
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
    .addRoute("POST", "/api/list/addItem", addShoppingItem, {
        requireAuth: true,
        acm: {
            resource: "lists",
            permission: "write",
        },
    })
    .addRoute("POST", "/api/list/removeItem", removeShoppingItem, {
        requireAuth: true,
        acm: {
            resource: "lists",
            permission: "delete",
        },
    })
    .addRoute("POST", "/api/list/newList", createNewShoppingList, {
        requireAuth: true,
        acm: {
            resource: "lists",
            permission: "write",
        },
    })
    .addRoute("POST", "/api/list/shareList", shareListWithUser, {
        requireAuth: true,
        acm: {
            resource: "lists",
            permission: "write",
        },
    })
    .serve();
