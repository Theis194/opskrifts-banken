#!/bin/sh
deno run --allow-write --allow-read --allow-net --allow-env ./banken/db/dummy_data.ts
exec deno run --allow-write --allow-read --allow-net --allow-env main.ts
