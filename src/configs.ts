import { PublicKey } from "@solana/web3.js";

export const configs = {
    network: process.env.NETWORK_URL || '',
    dbSeed: process.env.DB_SEED || '',
    dataSeed: process.env.DATA_SEED || '',
    port: process.env.PORT || 8080,
    mongoUri: process.env.MONGO_URL || '',
}

export const constants = {
    expectedReceiver: new PublicKey("GbgepibVcKMbLW6QaFrhUGG34WDvJ2SKvznL2HUuquZh"),
    programId: new PublicKey("FG5nDUjz4S1FBs2rZrXsKsa7J34e21WF17F8nFL9uwWi")
}