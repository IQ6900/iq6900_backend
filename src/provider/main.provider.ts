import { PublicKey } from "@solana/web3.js";
import { Program, Idl, web3 } from '@coral-xyz/anchor';
import idl from '../../idl.json';
import bs58 from 'bs58';
import crypto from 'crypto';
import { getDBPDA, getPDA } from "./pda.provider";

export const initializeUserAccounts = async (userKeyString: string) => {
    const userKey: any = new PublicKey(userKeyString);
    const PDA = await getPDA(userKey);
    const DBPDA = await getDBPDA(userKey);
  
    // userKey를 PublicKey 객체로 변환
    try {
        const program = new Program(idl as Idl, userKey);
        const tx = new web3.Transaction({
            feePayer: userKey, // 수수료 지불자 설정
        });
        const make_pda = await program.methods
            .userInitialize()
            .accounts({
                user: userKey,
                codeAccount: PDA,
                dbAccount: DBPDA,
            })
            .instruction();
        tx.add(make_pda);
    
        return tx;
    } catch (error) {
        console.error(error);
    }
}

export const generateMerkleRoot = (dataList: string[]) => {
    if (dataList.length === 0) return null;
    for (let num = 0; num<dataList.length; num++) {
        console.log("dataList"+num.toString()+"len: "+dataList[num].length);
    }


    console.log("dataList.length: "+dataList.length);
    let layer: string[] = dataList.map(base58Hash);

    while (layer.length > 1) {
        const nextLayer: string[] = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left: string = layer[i];
            const right: string = layer[i + 1] || layer[i];
            nextLayer.push(base58Hash(left + right));
        }
        layer = nextLayer;
    }

    return layer[0];
}

function base58Hash(data: string): string {
    const fullHash = hash(data);
    const buffer = Buffer.from(fullHash, "hex");
    return bs58.encode(buffer); // Base58로 인코딩
}

function hash(data: string) {
    return crypto.createHash("sha256").update(data).digest("hex");
}