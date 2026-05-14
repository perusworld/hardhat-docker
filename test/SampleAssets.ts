import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("SampleAssets", function () {
  it("deploys an ERC-20 with initial supply and owner minting", async function () {
    const [owner, alice] = await ethers.getSigners();
    const sampleToken = await ethers.deployContract("SampleToken", [owner.address]);

    expect(await sampleToken.name()).to.equal("Hardhat Sample Token");
    expect(await sampleToken.symbol()).to.equal("HST");
    expect(await sampleToken.decimals()).to.equal(18n);
    expect(await sampleToken.balanceOf(owner.address)).to.equal(ethers.parseEther("1000000"));

    await expect(sampleToken.transfer(alice.address, ethers.parseEther("10")))
      .to.emit(sampleToken, "Transfer")
      .withArgs(owner.address, alice.address, ethers.parseEther("10"));

    await expect(sampleToken.mint(alice.address, ethers.parseEther("5")))
      .to.emit(sampleToken, "Transfer")
      .withArgs(ethers.ZeroAddress, alice.address, ethers.parseEther("5"));

    expect(await sampleToken.balanceOf(alice.address)).to.equal(ethers.parseEther("15"));
  });

  it("deploys an ERC-721 and emits mint/transfer events", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const sampleNFT = await ethers.deployContract("SampleNFT", [owner.address]);

    expect(await sampleNFT.name()).to.equal("Hardhat Sample NFT");
    expect(await sampleNFT.symbol()).to.equal("HSNFT");

    await expect(sampleNFT.mint(alice.address))
      .to.emit(sampleNFT, "Transfer")
      .withArgs(ethers.ZeroAddress, alice.address, 1n);

    const aliceNFT = sampleNFT.connect(alice);

    await expect(aliceNFT.transferFrom(alice.address, bob.address, 1n))
      .to.emit(sampleNFT, "Transfer")
      .withArgs(alice.address, bob.address, 1n);

    expect(await sampleNFT.ownerOf(1n)).to.equal(bob.address);
    expect(await sampleNFT.nextTokenId()).to.equal(2n);
  });
});
