import { Http } from "./banken/server/wrapper.ts";
import { getAddRecipe, getIndex } from "./banken/server/routes/get.ts";
import { postLogin, postLogout, postNewRecipe } from "./banken/server/api/post.ts";

const server = await Http.create("./banken/public");

server
    .addRoute("GET", "/", getIndex, { requireAuth: false })
    .addRoute("GET", "/tilfoj-opskrift", getAddRecipe, {
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
    .addRoute("POST", "/api/login", postLogin, { requireAuth: false })
    .addRoute("POST", "/api/logout", postLogout, { requireAuth: false })
    .serve();
