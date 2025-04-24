import { Http } from "./banken/server/wrapper.ts";
import { getIndex, getAddRecipe } from "./banken/server/routes/get.ts";

const server = new Http("./banken/public");

server
  .addRoute("GET", "/", getIndex, false)
  .addRoute("GET", "/tilfoj-opskrift", getAddRecipe, false)
  .serve();

