FROM denoland/deno:alpine-1.40.0

CMD ["deno", "run", "--allow-write", "--allow-read", "./banken/db/dummy_data.ts"]
CMD ["deno", "run", "--allow-write", "--allow-read", "--allow-net", "main.ts"]
