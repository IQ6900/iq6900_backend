import express from 'express';
import setupRoutes from './routes';
import { configs } from './configs';

const app = express();
app.use(express.json({ limit: '10mb' }));
setupRoutes(app);

app.listen(configs.port, () => {
    console.log(`API server running on port ${process.env.PORT}`);
});