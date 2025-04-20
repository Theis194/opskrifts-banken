import { Http } from "./banken/server/wrapper.ts";
import { getIndex } from "./banken/server/routes/get.ts";

const server = new Http("./banken/public");

server
  .addRoute("GET", "/", getIndex, false)
  .serve();

