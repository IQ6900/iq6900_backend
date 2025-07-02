import {MongoClient, ServerApiVersion} from 'mongodb';
import {generateMerkleRoot} from "./main.provider";
import * as tp from "./transaction.provider";
import {fetchSignaturesForCache} from "./transaction.provider";
import {getDecodedChunks} from "./compress.provider";
import {configs} from "../configs";
import {PublicKey} from "@solana/web3.js";


export async function getMongoClient(): Promise<MongoClient> {
    const client = new MongoClient(configs.mongoUri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });
    await client.connect();
    return client;
}

interface TxDocument {
    _id: string, // ✅ _id를 string으로 설정
    merkle_root: string,
    block_time: number
}

export const getTxListFromDb = async (
    targetAddress: string,
    category: string,
    lastBlockTime: number = 999999999999,  // 기본적으로 가장 최신부터 시작
    _mongoUrl: string = configs.mongoUri
) => {

    let database: any;
    const client = await getMongoClient();
    database = client.db("TransactionLists");
    console.log('Connected to MongoDB');
    const collection = database.collection(`${targetAddress}/${category}`);

    const pageSize = 100;
    let filter: any = {block_time: {$lt: lastBlockTime}};  // blockTime 기준 필터링
    let  result = await collection
        .find(filter)
        .sort({block_time: -1})  // 최신 blockTime 기준 내림차순 정렬
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
    targetAddress: string,
    category: string,
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

    const client = await getMongoClient();

    try {
        const database = client.db("TransactionLists");
        const collection = database.collection<TxDocument>(`${targetAddress}/${category}`);
        const _targetAddress = new PublicKey(targetAddress);
        const new_sig = await fetchSignaturesForCache(_targetAddress, category);

        for (const sig of new_sig) {
            await collection.updateOne(
                {_id: sig.txId}, // 검색 조건
                {$set: {merkle_root: sig.merkleRoot, block_time: sig.blockTime}},
                {upsert: true}
            );
        }
        isUpdating = false;
        await client.close();
        return true;
    } catch (err) {
        await client.close();
        console.error("❌ Error updating MongoDB:", err);
        isUpdating = false;
        return false;
    }
};

async function getDataFromDb(merkleRoot: string, _mongoUrl: string = configs.mongoUri) {
    const client = await getMongoClient();
    let database: any;
    database = client.db('blockchainData');
    console.log('Connected to MongoDB');
    const collection = database.collection('merkleCaches');
    const result = await collection.findOne(
        {_id: merkleRoot},
        {projection: {data: 1, _id: 0}}  // `data`만 가져오기
    );
    await client.close();
    return result?.data;  // `data` 필드
}

const saveDataToDb = async (merkleRoot: string, data: string, _mongoUrl: string = configs.mongoUri) => {
    const client = await getMongoClient();
    let database: any;
    database = client.db('blockchainData');
    const collection = database.collection("merkleCaches");
    const result = await collection.insertOne({_id: merkleRoot, data});

    console.log("MongoDB result:", result);
    await client.close();
    return result;

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
                if (type == "image" || type == "test_image" || type == "q_image") {
                    chunks = getDecodedChunks(resultReverse, blockTime);//we need this
                }

                else {
                    chunks = getChunks(resultReverse);
                    // we dont need to chunk this again.
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
export const putChunks = async (chunks: string[], merkleRoot:string, _mongoUrl: string = configs.mongoUri) => {
    // let chunks = getChunks(dataStr);
    const calculatedMerkleRoot = generateMerkleRoot(chunks);
    console.log("calculatedMerkleRoot", calculatedMerkleRoot);
    if (calculatedMerkleRoot === merkleRoot) {
        const asciiString = chunks.join('')
        await saveDataToDb(merkleRoot, asciiString, _mongoUrl);
        return "success";
    } else {
        return ('Merkle root mismatch')
    }
}


