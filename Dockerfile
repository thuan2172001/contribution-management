FROM node:14-alpine

RUN apk add --no-cache --virtual .build-deps make gcc g++ python

RUN apk add --no-cache bash

WORKDIR /usr/app
RUN npm install -g nodemon

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 2999 3000

CMD [ "npm", "run", "start:prod" ]
