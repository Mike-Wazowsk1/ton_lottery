import { Cell, beginCell, Address, toNano } from "@ton/core"
import { TonClient } from '@ton/ton';
import { compile, sleep } from "@ton/blueprint";
import { KeyPair, sign } from '@ton/crypto';
import { getWalletData } from "./TON-CENTER-API"
import { Config, ConfigToCell } from "./Config"

type NetworkType = "MAINNET" | "TESTNET";

interface WalletData {
    keyPair: KeyPair;
    walletAddress: Address;
    client: TonClient;
}

function createStateinit(code: Cell, initialData: Cell): Cell {
    const stateInit = beginCell().
        storeBit(0).
        storeBit(0).
        storeBit(1).
        storeRef(code).
        storeBit(1).
        storeRef(initialData).
        storeBit(0).
        endCell();
    return stateInit;
}

function createDeployMessage(stateInit: Cell) {
    const contractAddress = new Address(0, stateInit.hash());
    console.log("Contract Address:", contractAddress);
    const internalMessageBody = beginCell().endCell();
    const internalMessage = beginCell().
        storeUint(0x10, 6). // no bounce
        storeAddress(contractAddress).
        storeCoins(toNano('0.05')).
        storeUint(0, 1 + 4 + 4 + 64 + 32).
        storeBit(1). // We have State Init
        storeBit(1). // state init as cell
        storeBit(1). // We store Message Body as a reference
        storeRef(stateInit).
        storeRef(internalMessageBody). // Store Message Body Init as a reference
        endCell();
    return internalMessage;
}

async function sendExternalMessage(walletData: WalletData, internalMessage: Cell) {
    let getMethodResult = await walletData.client.runMethod(walletData.walletAddress, 'seqno');
    const seqno = getMethodResult.stack.readNumber();
    await sleep(1000);
    getMethodResult = await walletData.client.runMethod(walletData.walletAddress, 'get_subwallet_id');
    const sub_wallet_id = getMethodResult.stack.readNumber();
    await sleep(1000);
    const toSign = beginCell().
        storeUint(sub_wallet_id, 32). // subwallet id
        storeUint(Math.floor(Date.now() / 1e3) + 60, 32). // valid until
        storeUint(seqno, 32).
        storeUint(0, 8). // op code in V4
        storeUint(3, 8). // send mode
        storeRef(internalMessage);
    const signature = sign(toSign.endCell().hash(), walletData.keyPair.secretKey);
    const body = beginCell().
        storeBuffer(signature).
        storeBuilder(toSign).
        endCell();
    const external = beginCell().
        storeUint(0b10, 2).
        storeUint(0, 2).
        storeAddress(walletData.walletAddress).
        storeCoins(0).
        storeBit(0).
        storeBit(1).
        storeRef(body).
        endCell();
    await walletData.client.sendFile(external.toBoc());
    for (let attempt = 0; attempt < 10; attempt++) {
        await sleep(5000);
        const seqnoAfter = (await walletData.client.runMethod(walletData.walletAddress, 'seqno')).stack.readNumber();
        if (seqnoAfter == seqno + 1) break;
    }
}

export async function deployer(config: Config, networkType: NetworkType) {
    const code: Cell = await compile("Lottery");
    const initialData: Cell = await ConfigToCell(config);
    const stateInit: Cell = createStateinit(code, initialData);
    const internalMessage: Cell = createDeployMessage(stateInit);
    const walletData: WalletData = await getWalletData(networkType);
    console.log(`Wallet on ${networkType}: ${walletData.walletAddress}`);
    sendExternalMessage(walletData, internalMessage);
}