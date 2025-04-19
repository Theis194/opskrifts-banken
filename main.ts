import { Http } from "./banken/server/wrapper.ts";

const server = new Http("./banken/public");

server
  .addRoute("GET", "/", getIndex, false)
  .serve();

function getIndex(req: Request): Promise<Response> {
  return Http.serveStaticFile(req, "./banken/public/index.html");
}
