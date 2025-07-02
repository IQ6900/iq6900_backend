import { Router } from 'express';
import cors from 'cors';

const allowedOrigins = [
    "https://iq6900.com",
    "https://elizacodein.com",
    "https://eliza-codein.pages.dev",
    "https://testbrowserforiq.web.app",
    "http://localhost:5500",
    "http://localhost:63342",
    "http://127.0.0.1:5500",
    "http://199.204.86.22:5500"
];

export default (router: Router): void => {
    const r = Router();
    r.use(
        cors({
            origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
            },
        })
    );
    
    router.use('/', r);
}