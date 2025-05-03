FROM denoland/deno:alpine-1.40.0

CMD ["run", "--allow-write", "--allow-read", "--allow-net", "main.ts"]
