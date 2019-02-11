FROM node:8.15-alpine

MAINTAINER Nobuyuki Matsui <nobuyuki.matsui@gmail.com>

WORKDIR /opt/kurento-signaling
COPY ./package.json /opt/kurento-signaling/package.json
COPY ./package-lock.json /opt/kurento-signaling/package-lock.json
COPY ./webpack.config.js /opt/kurento-signaling/webpack.config.js
COPY ./src /opt/kurento-signaling/src
COPY ./static/img /opt/kurento-signaling/static/img
COPY ./views /opt/kurento-signaling/views

RUN apk update && \
    apk add --no-cache tini && \
    apk add --no-cache --virtual .build git python2 g++ make && \
    npm install && \
    ./node_modules/.bin/webpack && \
    apk del .build

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/node", "/opt/kurento-signaling/dist/server.js"]
