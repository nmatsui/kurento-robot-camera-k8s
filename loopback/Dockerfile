FROM node:8.15-alpine

MAINTAINER Nobuyuki Matsui <nobuyuki.matsui@gmail.com>

WORKDIR /opt/kurento-loopback
COPY ./package.json /opt/kurento-loopback/package.json
COPY ./package-lock.json /opt/kurento-loopback/package-lock.json
COPY ./webpack.config.js /opt/kurento-loopback/webpack.config.js
COPY ./src /opt/kurento-loopback/src
COPY ./static/img /opt/kurento-loopback/static/img
COPY ./views /opt/kurento-loopback/views

RUN apk update && \
    apk add --no-cache tini && \
    apk add --no-cache --virtual .build git python2 g++ make && \
    npm install && \
    ./node_modules/.bin/webpack && \
    apk del .build

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/node", "/opt/kurento-loopback/dist/server.js"]
