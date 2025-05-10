import { Router } from 'express';
import * as controller from '../presentation/main.controller';

export default (router: Router): void => {
    const r = Router();
    r.get('/api/health', controller.getHealth);
    r.get('/getPDA/:userKey', controller.getPDAByUserId);
    r.get('/getCache', controller.getCache);
    r.get('/getTxList', controller.getCachedTxList);


    r.get('/getDBPDA/:userKey', controller.getDBPDAByUserId);
    r.get('/initialize-user/:userKey', controller.initializeUser);
    r.get('/get_transaction_info/:txId', controller.getTransactionInfo);
    r.get('/get_transaction_result/:tailTx', controller.getTransactionResult);
    r.get('/get_ascii_chunks/:imageUrl', controller.getAsciiChunks);

    r.post('/update-tx-list', controller.updateCachedTxList);
    r.post('/create-send-transaction', controller.createTransaction);
    r.post('/create-db-code-transaction', controller.createDBTransaction);
    r.post('/create-db-code-free-transaction', controller.createDBFreeTransaction);
    r.post('/create-db-ping-transaction', controller.createPingDBTransaction);

    r.post('/generate-merkle-root', controller.generateMerkleRoot);

    r.post('')

    router.use('/', r);
}