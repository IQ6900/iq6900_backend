import express from 'express';
import setupRoutes from './routes';
import { config } from 'dotenv';
config();
import { configs } from './configs';

const app = express();
app.use(express.json());
setupRoutes(app);

app.listen(configs.port, () => {
    console.log(`API server running on port ${configs.port}`);
});