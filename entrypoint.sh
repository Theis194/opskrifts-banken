#!/bin/sh
deno run --allow-write --allow-read ./banken/db/dummy_data.ts
exec deno run --allow-write --allow-read --allow-net main.ts
