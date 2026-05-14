FROM node:24 AS contracts
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN JOBS=MAX npm install --unsafe-perm && npm cache verify && rm -rf /tmp/*
COPY contracts ./contracts
COPY hardhat.config.ts tsconfig.json ./
RUN npx hardhat compile

FROM node:24 AS build
WORKDIR /workspace/block-explorer
COPY block-explorer/package.json block-explorer/package-lock.json ./
RUN JOBS=MAX npm install --unsafe-perm && npm cache verify && rm -rf /tmp/*
COPY block-explorer ./
ARG VITE_RPC_URL=http://127.0.0.1:8545
ENV VITE_RPC_URL=$VITE_RPC_URL
RUN npm run build

FROM node:24 AS runtime
WORKDIR /workspace/block-explorer
COPY --from=build /workspace/block-explorer ./
COPY --from=contracts /workspace/artifacts /workspace/artifacts
COPY ignition /workspace/ignition
COPY address-labels.example.env /workspace/address-labels.example.env
EXPOSE 8787
CMD ["npm", "run", "start"]
