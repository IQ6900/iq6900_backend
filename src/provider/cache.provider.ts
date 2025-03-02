import {MongoClient, ObjectId, ServerApiVersion} from 'mongodb';
import {generateMerkleRoot} from "./main.provider";
import * as tp from "./transaction.provider";
import {getDecodedChunks} from "./compress.provider";
import {configs} from "../configs";
import {fetchSignaturesForCache} from "./transaction.provider";
import {PublicKey} from "@solana/web3.js";
import * as timers from "node:timers";

interface TxDocument {
    _id: string, // ✅ _id를 string으로 설정
    merkle_root: string,
    block_time:number
}

export const getTxListFromDb = async (
    collectionName: string,
    type: string,
    lastBlockTime: number = 999999999999,  // 기본적으로 가장 최신부터 시작
    _mongoUrl: string = configs.mongoUri
) => {
    const client = new MongoClient(_mongoUrl, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    let database: any;
    await client.connect();
    database = client.db("TransactionLists");
    console.log('Connected to MongoDB');
    const collection = database.collection(`${collectionName}/${type}`);

    const pageSize = 100;
    let filter: any = { block_time: { $lt: lastBlockTime } };  // blockTime 기준 필터링

    const result = await collection
        .find(filter)
        .sort({ block_time: -1 })  // 최신 blockTime 기준 내림차순 정렬
        .limit(pageSize)
        .toArray();

    await client.close();
    return result;
};
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
let isUpdating = false;

export const updateTxListToDb = async (
    collectionName: string,
    dataType: string,
    _mongoUrl: string = configs.mongoUri
): Promise<boolean> => {
    if (isUpdating) {
        console.log("⚠️ duplicate updating!");
        return false;
    }
    console.log("✅ waiting...");
    isUpdating = true;
    await sleep(60000) // 트랜잭션 올라가는 시간 고려
    console.log("✅ updating...");

    const client = new MongoClient(_mongoUrl, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });

    try {
        await client.connect(); // ✅ MongoDB 연결을 기다려야 함
        const database = client.db("TransactionLists");
        const collection = database.collection<TxDocument>(`${collectionName}/${dataType}`);
        const targetWallet = new PublicKey(collectionName);
        const new_sig = await fetchSignaturesForCache(targetWallet, dataType);

        for (const sig of new_sig) {
            await collection.updateOne(
                {_id: sig.txId}, // 검색 조건
                {$set: {merkle_root: sig.merkleRoot, block_time: sig.blockTime}},
                {upsert: true}
            );
        }

        await client.close();
        isUpdating = false;
        return true;
    } catch (err) {
        console.error("❌ Error updating MongoDB:", err);
        await client.close();
        isUpdating = false;
        return false;
    }
};

async function getDataFromDb(merkleRoot: string, _mongoUrl: string = configs.mongoUri) {
    const client = new MongoClient(_mongoUrl, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    let database: any;
    await client.connect();
    database = client.db('blockchainData');
    console.log('Connected to MongoDB');
    const collection = database.collection('merkleCaches');
    const result = await collection.findOne(
        {_id: merkleRoot},
        {projection: {data: 1, _id: 0}}  // `data`만 가져오기
    );
    return result?.data;  // `data` 필드
}

const saveDataToDb = async (merkleRoot: string, data: string, _mongoUrl: string = configs.mongoUri) => {
    const client = new MongoClient(_mongoUrl, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    let database: any;
    client.connect()
        .then(async () => {
            database = client.db('blockchainData');
            const collection = database.collection("merkleCaches");
            const result = await collection.insertOne({_id: merkleRoot, data});
            console.log("MongoDB result:", result);
            return result;
        })
        .catch((err) => {
            console.error('Error connecting to MongoDB:', err);
            return null
        });
};
const getChunks = (chunks: any) => {
    let resultChunks: string[] = [];
    for (const chunk of chunks) {
        if (chunk.code) {
            resultChunks.push(chunk.code);
        }
    }
    return resultChunks;
}

export const getTransactionInfoFromCacheDb = async (transactionId: string, merkleRoot: string, _mongoUrl: string = configs.mongoUri) => {
    if (!transactionId || !merkleRoot) {
        return 'Invalid request: Missing transactionId or merkleRoot';
    }
    const cachedData = await getDataFromDb(merkleRoot, _mongoUrl);
    if (cachedData) {
        console.log('Data found in MongoDB');
        return cachedData
    } else {

        console.log('Data not found in MongoDB, fetching from blockchain...');
        try {
            const {result, type, blockTime} = await tp.readTransactionResult(transactionId);
            if (type !== '') {
                const resultReverse = result.reverse();
                let chunks: string[] = [];
                if (type == "image") {
                    chunks = getDecodedChunks(resultReverse, blockTime);
                } else if (type == "text" || type == "json" ||type == "love_letter") {
                    chunks = getChunks(resultReverse);
                }

                const calculatedMerkleRoot = generateMerkleRoot(chunks);
                console.log("calculatedMerkleRoot", calculatedMerkleRoot);
                console.log("merkleRoot", merkleRoot)

                if (calculatedMerkleRoot === merkleRoot) {
                    const asciiString = chunks.join('')
                    await saveDataToDb(merkleRoot, asciiString, _mongoUrl);
                    return asciiString;
                } else {
                    console.log('Merkle root mismatch')
                    const asciiString = chunks.join('')
                    return (asciiString)
                }
            } else {
                return '404 Not Found';
            }
        } catch (error) {
            return 'Error fetching data from blockchain';
        }
    }
}



