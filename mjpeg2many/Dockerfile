FROM node:8.15-alpine

MAINTAINER Nobuyuki Matsui <nobuyuki.matsui@gmail.com>

WORKDIR /opt/kurento-mjpeg2many
COPY ./package.json /opt/kurento-mjpeg2many/package.json
COPY ./package-lock.json /opt/kurento-mjpeg2many/package-lock.json
COPY ./webpack.config.js /opt/kurento-mjpeg2many/webpack.config.js
COPY ./src /opt/kurento-mjpeg2many/src
COPY ./static/img /opt/kurento-mjpeg2many/static/img
COPY ./views /opt/kurento-mjpeg2many/views

RUN apk update && \
    apk add --no-cache tini && \
    apk add --no-cache --virtual .build git python2 g++ make && \
    npm install && \
    ./node_modules/.bin/webpack && \
    apk del .build

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/node", "/opt/kurento-mjpeg2many/dist/server.js"]
