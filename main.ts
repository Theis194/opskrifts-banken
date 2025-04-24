import { Http } from "./banken/server/wrapper.ts";
import { getIndex, getAddRecipe } from "./banken/server/routes/get.ts";
import { postNewRecipe } from "./banken/server/api/post.ts"

const server = new Http("./banken/public");

server
  .addRoute("GET", "/", getIndex, false)
  .addRoute("GET", "/tilfoj-opskrift", getAddRecipe, false)
  .addRoute("POST", "/api/newRecipe", postNewRecipe, false)
  .serve();

