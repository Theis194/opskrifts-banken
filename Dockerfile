FROM denoland/deno:alpine-1.40.0

copy . .

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
