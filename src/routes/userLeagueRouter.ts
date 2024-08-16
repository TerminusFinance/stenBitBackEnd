import express, {Request, Response} from "express";
import UserLeagueController from "../controllers/userLeagueController";
import {InitDataParsed} from "@telegram-apps/init-data-node";
import {authMiddleware} from "../auth/authMiddleware";

const router = express.Router();

function UserLeagueRouter(userLeagueController: UserLeagueController) {


    router.get('/getListSubscriptionOptions', authMiddleware, async (req, res) => {
        try {
            const result = await userLeagueController.getListSubscriptionOptions()
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

    router.get('/getAllUsers', async (req: Request, res: Response) => {
        try {
            const allClans = await userLeagueController.getAllUserLeagues();
            res.status(200).json(allClans);
        } catch (error) {
            res.status(400).json({message: error});
        }
    });


    router.get('/getUserLeagueById', authMiddleware,async (req: Request, res: Response) => {
        try {
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id;
            if (userId !== undefined) {
                const allClans = await userLeagueController.getUserLeagueById(userId.toString());
                res.status(200).json(allClans);
            } else {res.status(400).json({ message: 'User ID is undefined' });}
        } catch (error) {
            res.status(400).json({message: error});
        }
    })

    router.post('/boostUserLevels', authMiddleware,async (req: Request, res: Response) => {
        try {
            const {selectedSubscriptionOptions} = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id;
            if (userId !== undefined) {
                const allClans = await userLeagueController.boostUserLevels(userId.toString(), selectedSubscriptionOptions);
                res.status(200).json(allClans);
            } else {res.status(400).json({ message: 'User ID is undefined' });}
        } catch (error) {
            res.status(400).json({message: error});
        }
    })

    return router;
}

export default UserLeagueRouter;