import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SampleAssetsModule", (m) => {
  const owner = m.getAccount(0);

  const sampleToken = m.contract("SampleToken", [owner]);
  const sampleNFT = m.contract("SampleNFT", [owner]);

  return { sampleNFT, sampleToken };
});
