FROM node:22 AS build
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app
RUN JOBS=MAX npm install --unsafe-perm && npm cache verify && rm -rf /tmp/*

FROM node:22 AS runtime
WORKDIR /usr/src/app
COPY --from=build /usr/src/app /usr/src/app
COPY contracts /usr/src/app/contracts
COPY scripts /usr/src/app/scripts
COPY test /usr/src/app/test
COPY *.sh /usr/src/app/
COPY *.ts /usr/src/app/
COPY tsconfig.json /usr/src/app/
RUN ls -la
EXPOSE 8545
ENTRYPOINT ["/bin/sh", "/usr/src/app/in-container.sh"]
