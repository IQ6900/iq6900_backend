import { PublicKey } from "@solana/web3.js";
import { web3 } from '@coral-xyz/anchor'
import { configs, constants } from "../configs";

export const getPDA = async (userKey: PublicKey): Promise<PublicKey> => {
    const [PDA, bump] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from(configs.dataSeed), userKey.toBuffer()],
        constants.programId
    );
    return PDA;
}

export const getDBPDA = async (userKey: PublicKey): Promise<PublicKey> => {
    const [DBPDA, DBbump] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from(configs.dbSeed), userKey.toBuffer()],
        constants.programId
    );
    return DBPDA;
}