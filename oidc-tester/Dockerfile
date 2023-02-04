FROM node:17.4.0-alpine3.15@sha256:44b4db12ba2899f92786aa7e98782eb6430e81d92488c59144a567853185c2bb

COPY ./tsconfig.json ./
COPY ./package*.json ./

RUN npm install && npm cache clean --force

COPY ./public ./public

COPY ./src ./src
RUN test -e ./src/oidc-config.json || (echo "src/oidc-config.json not found (see README.md)" && false)

EXPOSE 3000
CMD npm start