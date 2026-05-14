import { network } from "hardhat";

const { ethers } = await network.create({
  network: process.env.HARDHAT_NETWORK ?? "localnode",
});

const [deployer, alice, bob, carol] = await ethers.getSigners();

console.log("Deploying sample token and NFT contracts");
console.log("Deployer:", deployer.address);

const sampleToken = await ethers.deployContract("SampleToken", [deployer.address]);
await sampleToken.waitForDeployment();

const sampleNFT = await ethers.deployContract("SampleNFT", [deployer.address]);
await sampleNFT.waitForDeployment();

console.log("SampleToken:", await sampleToken.getAddress());
console.log("SampleNFT:", await sampleNFT.getAddress());

const transfers = [
  [alice.address, ethers.parseEther("1250")],
  [bob.address, ethers.parseEther("850")],
  [carol.address, ethers.parseEther("425")],
] as const;

for (const [recipient, amount] of transfers) {
  const tx = await sampleToken.transfer(recipient, amount);
  await tx.wait();
  console.log("ERC20 transfer:", ethers.formatEther(amount), "HST to", recipient);
}

const aliceToken = sampleToken.connect(alice);
const bobToken = sampleToken.connect(bob);

await (await aliceToken.transfer(bob.address, ethers.parseEther("125"))).wait();
await (await bobToken.transfer(carol.address, ethers.parseEther("40"))).wait();

console.log("ERC20 secondary transfers created");

const nftRecipients = [deployer.address, alice.address, bob.address, carol.address] as const;

for (const recipient of nftRecipients) {
  const tx = await sampleNFT.mint(recipient);
  const receipt = await tx.wait();
  console.log("ERC721 mint tx:", receipt?.hash, "to", recipient);
}

const aliceNFT = sampleNFT.connect(alice);
const bobNFT = sampleNFT.connect(bob);

await (await aliceNFT.transferFrom(alice.address, bob.address, 2n)).wait();
await (await bobNFT.transferFrom(bob.address, carol.address, 2n)).wait();

console.log("ERC721 secondary transfers created");
console.log("Seed complete");
