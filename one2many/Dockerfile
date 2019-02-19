FROM node:8.15-alpine

MAINTAINER Nobuyuki Matsui <nobuyuki.matsui@gmail.com>

WORKDIR /opt/kurento-one2many
COPY ./package.json /opt/kurento-one2many/package.json
COPY ./package-lock.json /opt/kurento-one2many/package-lock.json
COPY ./webpack.config.js /opt/kurento-one2many/webpack.config.js
COPY ./src /opt/kurento-one2many/src
COPY ./static/img /opt/kurento-one2many/static/img
COPY ./views /opt/kurento-one2many/views

RUN apk update && \
    apk add --no-cache tini && \
    apk add --no-cache --virtual .build git python2 g++ make && \
    npm install && \
    ./node_modules/.bin/webpack && \
    apk del .build

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/node", "/opt/kurento-one2many/dist/server.js"]
