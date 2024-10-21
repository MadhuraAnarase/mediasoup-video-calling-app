import { Router, Request, Response } from 'express';

const router = Router();
let mediasoupRouter: any = null;

export const setMediasoupRouter = (routerInstance: any) => {
    mediasoupRouter = routerInstance;
};

// router.get('/rtp-capabilities', (req: Request, res: Response) => {
//     if (!mediasoupRouter) {
//         return res.status(500).json({ error: 'Router not initialized' });
//     }
//     return res.json(mediasoupRouter.rtpCapabilities);
// });

export default router;
