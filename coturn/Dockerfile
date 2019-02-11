FROM alpine:latest

MAINTAINER Nobuyuki Matsui <nobuyuki.matsui@gmail.com>

RUN apk update && \
    apk add --no-cache coturn

ENTRYPOINT ["/usr/bin/turnserver"]
CMD ["-v"]
