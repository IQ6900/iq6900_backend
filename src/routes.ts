import { Express, Router, NextFunction, Request, Response } from 'express';
import { readdirSync } from 'fs';
import { join } from 'path';

export default (app: Express): void => {
    const router = Router();

    router.use((req: Request, res: Response, next: NextFunction) => {
        console.log(`Client: ${req.method} ${req.originalUrl}`); // for debugging purposes. REMOVE IN PROD
        next();
    });
    
    app.use('/', router);
    readdirSync(join(__dirname, './routes')).map(async file => {
        if (!file.endsWith('.map')) {
            (await import(`./routes/${file}`)).default(router);
        }
    });
}