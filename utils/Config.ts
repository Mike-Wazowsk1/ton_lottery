import { Cell, beginCell, Address, toNano} from "@ton/core";

export type Config = {
    owner_address: Address;
    dev_wallet: Address;
    dev_reward: bigint;
    is_locked: number;
    triger_amount: bigint;
    each_ticket_price: bigint;
    total_tickets: number;
    players: null;
    round_count: number;
    round_winners: null;
}

export async function ConfigToCell(config: Config): Promise<Cell> {
    const master: Cell = beginCell().storeAddress(config.owner_address).storeAddress(config.dev_wallet).storeCoins(config.dev_reward).endCell();
    const configs: Cell = beginCell().storeInt(config.is_locked, 2).storeCoins(config.triger_amount).storeCoins(config.each_ticket_price).endCell();
    const currentData: Cell = beginCell().storeUint(config.total_tickets, 64).storeDict(config.players).storeUint(config.round_count, 64).storeDict(config.round_winners).endCell();
    const initialData: Cell = beginCell().storeRef(master).storeRef(configs).storeRef(currentData).endCell();
    return initialData;
}