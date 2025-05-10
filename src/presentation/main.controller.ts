import {PublicKey} from "@solana/web3.js";
import {Request, Response} from "express";
import * as tp from "../provider/transaction.provider";
import * as mp from "../provider/main.provider";
import * as pp from "../provider/pda.provider";
import * as cp from "../provider/cache.provider";

import {decodeByChunks,makeAsciiChunks} from "../provider/compress.provider";

import {configs} from "../configs";

/**
 * [GET] /getPDA/:userKey
 * 사용자 키에 해당하는 PDA를 가져옴
 * @returns PDA
 */
export const getPDAByUserId = async (req: Request, res: Response): Promise<void> => {
    try {
        const userKey = new PublicKey(req.params.userKey); // URL 파라미터에서 사용자 키를 가져옴
        const PDA = await pp.getPDA(userKey);
        res.json({PDA: PDA});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Failed to get PDA"});
    }
}
/**
 * [GET] /getDBPDA/:userKey
 * 사용자 키에 해당하는 DBPDA를 가져옴
 * @returns DBPDA
 */
export const getDBPDAByUserId = async (req: Request, res: Response): Promise<void> => {
    try {
        const userKey = new PublicKey(req.params.userKey); // URL 파라미터에서 사용자 키를 가져옴
        const DBPDA = await pp.getDBPDA(userKey);
        res.json({DBPDA: DBPDA.toBase58()});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Failed to get DBPDA"});
    }
}
/**
 * [GET] /initialize-user/:userKey
 * 사용자 계정 초기화, 최초 1회 실행해야 함
 */
export const initializeUser = async (req: Request, res: Response): Promise<void> => {
    const userKeyString = req.params.userKey; // URL 파라미터에서 사용자 키를 가져옴
    try {
        const transaction = await mp.initializeUserAccounts(userKeyString);
        res.json({transaction: transaction});
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({error: error.message});
        } else {
            res.status(500).json({error: "Failed to initialize user"});
        }
    }
}
/**
 * [GET] /get_transaction_info/:txId
 * 트랜잭션 정보 가져오기
 */
export const getTransactionInfo = async (req: Request, res: Response): Promise<void> => {
    const txId = req.params.txId;
    try {
        const argData = await tp.readTransaction(txId); // 결과를 기다림
        res.json({argData: argData}); // JSON 응답
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            res.status(500).json({error: error.message}); // 에러 응답
        } else {
            res.status(500).json({error: "Failed to get transaction info"}); // 에러 응답
        }
    }
}
/**
 * [GET] 'getCache
 * txId,merkleRoot
 * 트랜잭션 정보 가져오기
 */
export const getCache = async (req: Request, res: Response): Promise<void> => {
    try {
        const {txId, merkleRoot} = req.query;  // query에서 받기
        const _txId = String(txId);
        const _merkleRoot = String(merkleRoot);

        const response = await cp.getTransactionInfoFromCacheDb(_txId, _merkleRoot); // 결과를 기다림
        res.send(response);
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            res.status(500).json({error: error.message}); // 에러 응답
        } else {
            res.status(500).json({error: "Failed to get transaction info"}); // 에러 응답
        }
    }
}

export const getCachedTxList = async (req: Request, res: Response): Promise<void> => {
    try {
        const {targetAddress, category, lastBlock = 99999999999, mongoUrl = configs.mongoUri} = req.query;

        const _targetAddress = String(targetAddress);
        const _category = String(category);
        const _lastBlock = Number(lastBlock);
        const _mongoUrl = String(mongoUrl);

        const response = await cp.getTxListFromDb(_targetAddress, _category, _lastBlock, _mongoUrl); // 결과를 기다림
        res.send(response);
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            res.status(500).json({error: error.message}); // 에러 응답
        } else {
            res.status(500).json({error: "Failed to get transaction info"}); // 에러 응답
        }
    }
}

export const updateCachedTxList = async (req: Request, res: Response): Promise<void> => {
    try {
        const {targetAddress, category, mongoUrl = configs.mongoUri} = req.body;
        const _targetAddress = String(targetAddress);
        const _category = String(category);
        const _mongoUrl = String(mongoUrl);

        const response = await cp.updateTxListToDb(_targetAddress, _category, _mongoUrl); // 결과를 기다림
        res.send(response);
    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            res.status(500).json({error: error.message}); // 에러 응답
        } else {
            res.status(500).json({error: "Failed to get transaction info"}); // 에러 응답
        }
    }
}
// 아래는 제공용 함수, 라이브러리등을 만들어줄때 우리 디비 말고 그쪽 디비를 쓰도록 유도.
// export const getCacheFromCustomDB = async (req: Request, res: Response): Promise<void> => {
//     try {
//         const { txId, merkleRoot ,dbUrl} = req.query;  // query에서 받기
//         const _txId = String(txId);
//         const _merkleRoot = String(merkleRoot);
//
//         const _dbUrl = String(merkleRoot);
//         const response = await cp.getTransactionInfoFromCacheDb(_txId,_merkleRoot,_dbUrl); // 결과를 기다림
//         res.send(response);
//     } catch (error) {
//         if (error instanceof Error) {
//             console.error(error);
//             res.status(500).json({ error: error.message }); // 에러 응답
//         } else {
//             res.status(500).json({ error: "Failed to get transaction info" }); // 에러 응답
//         }
//     }
// }

/**
 * [GET] /get_transaction_result/:tailTx
 * 트랜잭션 정보 가져오기
 */
export const getTransactionResult = async (req: Request, res: Response): Promise<void> => {
    const tailTx = req.params.tailTx;
    try {
        const {result, type, blockTime} = await tp.readTransactionResult(tailTx); // 결과를 기다림

        if (blockTime !== 0) {
            const resultReverse = result.reverse();
            let response = "";
            if (type == "image"||type == "test_image" || type == "q_image") {
                response = decodeByChunks(resultReverse);
            } else {
                let resultText: string = "";
                for (const chunk of resultReverse) {
                    if (chunk.code) {
                        resultText += chunk.code;
                    }
                }
                response = resultText;
            }
            res.send(response);
        } else {
            res.send('404 Not Found');
        }

    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            res.status(500).json({error: error.message}); // 에러 응답
        } else {
            res.status(500).json({error: "Failed to get transaction info"}); // 에러 응답
        }
    }
}
/**
 * [GET] /getAsciiChunks/:imageUrl
 * 이미지 URL 로 아스키아트, 청크 만들기
 */

export const getAsciiChunks = async (req: Request, res: Response): Promise<void> => {
    const imageUrl = req.params.imageUrl;
    try {
        const asciiChunks = await makeAsciiChunks(imageUrl)
        res.json({ascii_chunks: asciiChunks});
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({error: error.message});
        } else {
            res.status(500).json({error: "Failed to create transaction"});
        }
    }
}

/**
 * [POST] /create-send-transaction
 * 트랜잭션 생성
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
    const {userKeyString, code, before_tx, method, decode_break} = req.body;
    try {
        const tx = await tp.createSendTransaction(
            userKeyString,
            code,
            before_tx,
            method,
            decode_break
        );
        res.json({transaction: tx});
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({error: error.message});
        } else {
            res.status(500).json({error: "Failed to create transaction"});
        }
    }
}
/**
 * [POST] /create-db-code-transaction
 * 트랜잭션 DB 코드 생성
 */
export const createDBTransaction = async (req: Request, res: Response): Promise<void> => {
    const {userKeyString, handle, tail_tx, type, offset} = req.body;
    try {
        const tx = await tp.createDbCodeTransaction(
            userKeyString,
            handle,
            tail_tx,
            type,
            offset
        );
        res.json({transaction: tx});
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({error: error.message});
        } else {
            res.status(500).json({error: "Failed to create transaction"});
        }
    }
}
/**
 * [POST] /create-db-code-free-transaction
 * 트랜잭션 DBFREE 코드 생성
 */
export const createDBFreeTransaction = async (req: Request, res: Response): Promise<void> => {
    const {userKeyString, handle, tail_tx, type, offset} = req.body;
    try {
        const tx = await tp.createDbCodeFreeTransaction(
            userKeyString,
            handle,
            tail_tx,
            type,
            offset
        );
        res.json({transaction: tx});
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({error: error.message});
        } else {
            res.status(500).json({error: "Failed to create transaction"});
        }
    }
}
export const createPingDBTransaction = async (req: Request, res: Response): Promise<void> => {
    const { userKeyString, pingWalletString, pingAmount, handle, tail_tx, type, offset } = req.body;
    try {
        const tx = await tp.createPingDBTransaction(
            userKeyString,
            pingWalletString,
            pingAmount,
            handle,
            tail_tx,
            type,
            offset
        );
        res.json({ transaction: tx });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Failed to create transaction" });
        }
    }
};

/**
 * [POST] /generate-merkle-root
 * Merkle Root 생성
 */
export const generateMerkleRoot = async (req: Request, res: Response): Promise<any> => {
    const {data} = req.body;
    if (!Array.isArray(data) || data.length === 0) {
        return res
            .status(400)
            .json({error: "Invalid data. Provide a non-empty array of strings."});
    }

    try {
        const merkleRoot = mp.generateMerkleRoot(data);
        res.json({merkleRoot});
    } catch (err) {
        console.error("Error generating Merkle Root:", err);
        res.status(500).json({error: "Failed to generate Merkle Root."});
    }

}