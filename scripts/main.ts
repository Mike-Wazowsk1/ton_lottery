import { toNano } from '@ton/core';
import { Lottery } from '../wrappers/Lottery';
import { compile, NetworkProvider } from '@ton/blueprint';
import { deployer } from "../utils/Deployer"
import { Config } from "../utils/Config";
import { getWalletData, NetworkType } from "../utils/TON-CENTER-API";

async function deploy(networkType: NetworkType): Promise<void> {
    const config: Config = {
        owner_address: (await getWalletData(networkType)).walletAddress,
        dev_wallet: (await getWalletData(networkType)).walletAddress,
        dev_reward: toNano("10"), // 10 ton
        is_locked: 0, // default is unlock
        triger_amount: toNano("100"), // 100 ton
        each_ticket_price: toNano("1"), // 1 ton
        total_tickets: 0, // initial total tickets must be zero
        players: null,
        round_count: 0, // initial round count must be zero
        round_winners: null,
    }

    deployer(config, networkType);
}

deploy("TESTNET");