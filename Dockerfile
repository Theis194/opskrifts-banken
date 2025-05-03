FROM denoland/deno:alpine-1.40.0

WORKDIR /app

# Cache dependencies (faster rebuilds)
COPY deps.ts .
RUN deno cache deps.ts

# Copy all files
COPY . .

CMD["run", "--allow-write", "--allow-read", "--allow-net", "main.ts"]
