import {Connection, PublicKey, SystemProgram} from "@solana/web3.js";
import {Idl, web3, BorshInstructionCoder, Program} from '@coral-xyz/anchor'
import {configs, constants} from "../configs";
import idl from '../../idl.json';
import {getDBPDA, getPDA} from "./pda.provider";

const amountToSend = 0.003 * web3.LAMPORTS_PER_SOL;
const connection = new Connection(configs.network);

async function bringInfo(dataTxid: string) {
    let offset = "";
    let type_field = "";
    let blockTime = 0;
    const txInfo = await readTransaction(dataTxid);
    offset = txInfo.offset;
    type_field = txInfo.type_field;
    blockTime = txInfo.blockTime;
    return {type_field, offset, blockTime};
}

export const fetchSignaturesForCache = async (address: PublicKey, typeString: string = "SolanaInternet", db_max_block_time:number = 0, limit: number = 100): Promise<{
    txId: string,
    merkleRoot: string,
    blockTime: number
}[]> => {
    let before:any = null
    let allSignatures: { txId: string, merkleRoot: string, blockTime: number }[] = [];
    while (true) {
        const signatures = await connection.getSignaturesForAddress(address, {
            before: before,
            limit: limit, // 한 번에 100개씩 가져오기
        });
        if (signatures.length === 0) break; // 더 이상 가져올 데이터 없음
        for (let i = 0; i < signatures.length; i++) {
            const info = await bringInfo(signatures[i].signature);

            if (info.blockTime <= db_max_block_time) {
                console.log(`🛑 Encountered blockTime (${info.blockTime}) <= latestBlockTime (${db_max_block_time}). Stopping.`);
                return allSignatures; // ✅ 중단하고 결과 리턴
            }

            if (typeString === "SolanaInternet") {
                if (info.type_field === "image"|| info.type_field === "text") {
                    if (!allSignatures.includes({
                        txId: signatures[i].signature,
                        merkleRoot: info.offset,
                        blockTime: info.blockTime
                    })) {
                        allSignatures.push({
                            txId: signatures[i].signature,
                            merkleRoot: info.offset,
                            blockTime: info.blockTime
                        });

                    }
                }
            } else if (info.type_field === typeString) {
                if (!allSignatures.includes({
                    txId: signatures[i].signature,
                    merkleRoot: info.offset,
                    blockTime: info.blockTime
                })) {
                    allSignatures.push({
                        txId: signatures[i].signature,
                        merkleRoot: info.offset,
                        blockTime: info.blockTime
                    });

                } else {
                    return allSignatures;
                }
            }
        }
        before = signatures[signatures.length - 1].signature;
    }
    return allSignatures;
}

export const readTransaction = async (transaction: string): Promise<any> => {
    let argData: any = undefined; // 결과를 저장할 배열

    try {
        // 트랜잭션 가져오기
        const tx = await connection.getTransaction(transaction);
        if (tx) {
            console.log("Transaction Details:");
            const instructions = tx.transaction.message.instructions;

            for (const instruction of instructions) {
                const coder = new BorshInstructionCoder(idl as Idl);
                const args = coder.decode(instruction.data, "base58");
                if (args) {
                    argData = args.data;
                    argData.blockTime = tx.blockTime;
                }
            }
        } else {
            return false;
        }
    } catch (err) {
        console.error("Error fetching transaction:", err);
    }

    return argData; // 결과 반환
}
export const readTransactionResult = async (transaction: string): Promise<any> => {
    let result: any[] = []; // 결과를 저장할 배열
    let lastArgs: any = undefined; // 결과를 저장할 배열
    let type: string = "";
    let blockTime = 0;
    try {
        // 트랜잭션 가져오기
        do {
            let startTime = performance.now();
            const tx = await connection.getTransaction(transaction);
            if (tx) {
                const instructions = tx.transaction.message.instructions;
                for (const instruction of instructions) {
                    const coder = new BorshInstructionCoder(idl as Idl);
                    const args = coder.decode(instruction.data, "base58");
                    if (args) {
                        lastArgs = args.data;
                        if (lastArgs["tail_tx"] !== undefined && type === "") {
                            type = lastArgs["type_field"];
                        } else {
                            result.push(lastArgs);
                        }
                    }
                }
                if (tx.blockTime) {
                    blockTime = tx.blockTime;
                }

            } else {
                return {result, type, blockTime}; // 결과 반환
            }
            transaction = lastArgs["tail_tx"] === undefined ? lastArgs["before_tx"] : lastArgs["tail_tx"];
            let endTime = performance.now();
            let executionTime = endTime - startTime;
            console.log(`실행 시간: ${executionTime.toFixed(2)}ms`);
        } while (lastArgs["before_tx"] !== null && lastArgs["before_tx"] !== 'Genesis');
    } catch (err) {
        console.error("Error fetching transaction:", err);
    }

    return {result, type, blockTime}; // 결과 반환
}
// export const readTransactionResult2 = async (transaction: string): Promise<any> => {
//     const connection = new Connection(configs.network);
//     let result: any[] = []; // 결과를 저장할 배열
//     let lastArgs: any = undefined; // 결과를 저장할 배열
//     let type: string = "";
//     try {
//         const tx = await connection.getTransaction(transaction);
//         if (tx) {
//             const instructions = tx.transaction.message.instructions;
//             for (const instruction of instructions) {
//                 const coder = new BorshInstructionCoder(idl as Idl);
//                 const args = coder.decode(instruction.data, "base58");
//                 if (args) {
//                     lastArgs = args.data;
//                     type = lastArgs["type_field"];
//                 }
//             }
//         }
//     } catch (err) {
//         console.error("Error fetching transaction:", err);
//     }

//     try {
//         let tailTx = lastArgs["tail_tx"];
//         const lastTx = await connection.getTransaction(tailTx);
//         if (!lastTx) {
//             return;
//         }
//         const confirmedSignatures = await connection.getSignaturesForAddress(
//             new PublicKey(lastTx.transaction.message.accountKeys[0]),
//             {
//                 before: transaction,
//                 limit: 6
//             }
//         );
//         const txList = await connection.getTransactions(confirmedSignatures.map((s) => s.signature));
//         for (const tx of txList) {
//             if (tx) {
//                 const instructions = tx.transaction.message.instructions;
//                 for (const instruction of instructions) {
//                     const coder = new BorshInstructionCoder(idl as Idl);
//                     const args = coder.decode(instruction.data, "base58");
//                     if (args) {
//                         lastArgs = args.data;
//                         result.push(lastArgs);
//                     }
//                     if (lastArgs["before_tx"] !== null && lastArgs["before_tx"] === 'Genesis') {
//                         break;
//                     }
//                 }
//             }
//         }
//     } catch (err) {
//         console.error("Error fetching transaction:", err);
//     }

//     return { result, type }; // 결과 반환
// }
export const createSendTransaction = async (userKeyString: any, code: any, before_tx: any, method: any, decode_break: any) => {
    try {
        const userKey: any = new PublicKey(userKeyString);
        const PDA = await getPDA(userKey);
        const program = new Program(idl as Idl, userKey);
        const tx = new web3.Transaction({
            feePayer: userKey, // 수수료 지불자 설정
        });
        const ix = await program.methods
            .sendCode(code, before_tx, method, decode_break)
            .accounts({
                user: userKey,
                codeAccount: PDA,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        tx.add(ix); // 트랜잭션에 추가
        return tx;
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            throw new Error("Failed to create instruction: " + error.message);
        } else {
            console.error(error);
            throw new Error("Failed to create instruction: " + error);
        }
    }
}

export const createDbCodeTransaction = async (userKeyString: any, handle: any, tail_tx: any, type: any, offset: any) => {
    try {
        const userKey: any = new PublicKey(userKeyString);
        const DBPDA = await getDBPDA(userKey);
        const program = new Program(idl as Idl, userKey);
        const tx = new web3.Transaction({
            feePayer: userKey, // 수수료 지불자 설정
        });

        const transix = web3.SystemProgram.transfer({
            fromPubkey: userKey, // 송금할 사용자 계정
            toPubkey: DBPDA,
            lamports: amountToSend, // 송금할 금액
        });

        tx.add(transix);

        const dbcodeix = await program.methods
            .dbCodeIn(handle, tail_tx, type, offset)
            .accounts({
                user: userKey,
                dbAccount: DBPDA,
                systemProgram: SystemProgram.programId,
            })
            .remainingAccounts([
                {pubkey: constants.expectedReceiver, isSigner: false, isWritable: true},
            ])
            .instruction();

        tx.add(dbcodeix);
        return tx;
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            throw new Error("Failed to create instruction: " + error.message);
        } else {
            throw new Error("Failed to create instruction: " + error);
        }
    }
}

export const createDbCodeFreeTransaction = async (userKeyString: any, handle: any, tail_tx: any, type: any, offset: any) => {
    try {
        const userKey: any = new PublicKey(userKeyString);
        const DBPDA = await getDBPDA(userKey);
        const program = new Program(idl as Idl, userKey);
        const tx = new web3.Transaction({
            feePayer: userKey, // 수수료 지불자 설정
        });
        const dbcodefreeix = await program.methods
            .dbCodeInForFree(handle, tail_tx, type, offset)
            .accounts({
                user: userKey,
                dbAccount: DBPDA,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        tx.add(dbcodefreeix);
        return tx;
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            throw new Error("Failed to create instruction: " + error.message);
        } else {
            throw new Error("Failed to create instruction: " + error);
        }
    }
}