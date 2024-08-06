import express, {Request, Response} from "express";
import clanController from "../controllers/clanController";
import {authMiddleware} from "../auth/authMiddleware";
import {InitDataParsed} from "@telegram-apps/init-data-node";

const router = express.Router();

function clanRouter(clanController: clanController) {

    router.get('/getListSubscriptionOptions', authMiddleware, async (req, res) => {
        try {
            const result = await clanController.getListSubscriptionOptions()
            if (!result) {
                res.status(404).json({message: 'Not found'});
            } else {
                res.status(200).json(result);
            }
        } catch (error) {
            console.error('Ошибка getListSubscriptionOptions:', error);
            res.status(400).json({message: error});
        }
    });

    router.get('/getAllClans', async (req: Request, res: Response) => {
        try {
            const leagueLevels = await clanController.getAllClans();
            res.status(200).json(leagueLevels);
        } catch (error) {
            res.status(400).json({message: error});
        }
    });

    router.get('/getUserClan', authMiddleware, async (req: Request, res: Response) => {
        try {
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id;

            if (userId !== undefined) {
                const userClanInfo = await clanController.getUserClan(userId.toString());

                if (userClanInfo.clan) {
                    res.status(200).json({
                        clan: userClanInfo.clan,
                        role: userClanInfo.role,
                        contributedRating: userClanInfo.contributedRating
                    });
                } else {
                    res.status(200).json({ message: userClanInfo.message });
                }
            } else {
                res.status(400).json({ message: 'User ID is undefined' });
            }
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });


    router.post('/addUserToClan', authMiddleware, async (req: Request, res: Response) => {
        try {
            const { clanId } = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id;

            if (userId != undefined) {
                const result = await clanController.addUserToClan(userId.toString(), clanId);
                res.status(200).json({ message: result });
            } else {
                res.status(400).json({ message: "auth data is null" });
            }
        } catch (e) {
            console.error(e);

            if (e instanceof Error) {
                res.status(400).json({ message: e.message });
            } else {
                res.status(400).json({ message: "Unknown error occurred" });
            }
        }
    });


    router.post('/getClanWithUsers', authMiddleware, async (req: Request, res: Response) => {
        try {
            const {clanId} = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            if (userId != undefined) {
                const result = await clanController.getClanWithUsers(clanId)
                res.status(200).json(result);
            } else {
                res.status(400).json({message: "auth data is null"});
            }
        } catch (e) {
            res.status(400).json({message: e});
        }
    })


    router.post('/createClan', authMiddleware, async (req: Request, res: Response) => {
        try {
            const {clanName, descriptions} = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            if (userId != undefined) {
                const result = await clanController.createClan(clanName, descriptions, userId.toString())
                res.status(200).json({message: result});
            } else {
                res.status(400).json({message: "auth data is null"});
            }
        } catch (e) {
            if (e instanceof Error) {
                res.status(400).json({ message: e.message });
            } else {
                res.status(400).json({ message: "Unknown error occurred" });
            }
        }
    })

    router.post('/getClansByLeagueLevels', authMiddleware, async (req: Request, res: Response) => {
        try {
            const {levels} = req.body;
            if (!levels || !Array.isArray(levels)) {
                return res.status(400).json({message: 'Invalid levels parameter'});
            }
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            if (userId != undefined) {
                const result = await clanController.getClansByLeagueLevels(levels)
                res.status(200).json(result);
            } else {
                res.status(400).json({message: "auth data is null"});
            }
        } catch (e) {
            res.status(400).json({message: e});
        }
    })

    router.delete('/leaveClan', authMiddleware, async (req: Request, res: Response) => {
        try {
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            if (userId != undefined) {
                const result = await clanController.leaveClan(userId.toString())
                res.status(200).json(result);
            } else {
                res.status(400).json({message: "auth data is null"});
            }
        } catch (e) {
            res.status(400).json({message: e});
        }
    })

    return router;
}

export default clanRouter;