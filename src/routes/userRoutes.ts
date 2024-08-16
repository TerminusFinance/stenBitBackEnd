import express, {Request, Response} from 'express';
import UserController from '../controllers/userController';
import {authMiddleware} from "../auth/authMiddleware";
import {InitDataParsed} from "@telegram-apps/init-data-node";

const router = express.Router();

function userRouter(userController: UserController) {
    router.post('/createNewUsers', authMiddleware, async (req: Request, res: Response) => {
        const {address} = req.body;
        try {
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            const name = initData.user?.firstName
            if (userId != undefined && name != undefined) {
                const user = await userController.createUser(userId.toString(), name, 0, address);
                res.status(201).json(user);
            }
        } catch (error) {
            res.status(400).json({message: error});
        }
    });

    router.get('/getUser', authMiddleware, async (req: Request, res: Response) => {

        try {
            const initData = res.locals.initData as InitDataParsed;

            const id = initData.user?.id
            const image = initData.user?.photoUrl
            console.error("image -  -", image)
            if (id != undefined) {
                const user = await userController.getUserFromId(id.toString(), image ? image : null);
                if (!user) {
                    res.status(404).json({message: 'User not found'});
                } else {
                    res.status(200).json(user);
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении буста:', error);
            res.status(400).json({message: error});
        }
    });


    router.get('/getUserSimple', authMiddleware, async (req: Request, res: Response) => {

        try {
            const initData = res.locals.initData as InitDataParsed;
            const id = initData.user?.id
            if (id != undefined) {
                const user = await userController.getUserFromIdSimply(id.toString());
                if (!user) {
                    res.status(404).json({message: 'User not found'});
                } else {
                    res.status(200).json(user);
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении буста:', error);
            res.status(400).json({message: error});
        }
    });

    router.put('/updateUsers', authMiddleware, async (req: Request, res: Response) => {
        try {
            const initData = res.locals.initData as InitDataParsed;

            const id = initData.user?.id
            if (id != undefined) {
                const updatedUser = await userController.updateUser(id.toString(), req.body);
                res.status(200).json(updatedUser);
            }
        } catch (error) {
            console.error(error)
            res.status(400).json({message: error});
        }
    });

    router.post('/addCoins', authMiddleware, async (req: Request, res: Response) => {
        try {
            const {coins} = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const id = initData.user?.id
            if (id != undefined) {
                const updatedUser = await userController.addCoinsAndDeductEnergy(id.toString(), coins);
                res.status(200).json(updatedUser);
            }
        } catch (error) {
            console.error(error)
            res.status(400).json({message: error});
        }
    });

    router.post('/processInvitation', authMiddleware, async (req, res) => {
        try {
            const {inviteCode} = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            const name = initData.user?.firstName
            const prem = initData.user?.isPremium
            if (userId != undefined && name != undefined) {
                const user = await userController.processInvitation(inviteCode, userId.toString(), name, prem ? prem : false);
                res.status(201).json(user);
            }
        } catch (error) {
            res.status(400).json({message: error});
        }
    });

    router.post('/updateBoost', authMiddleware, async (req, res) => {
        try {
            const {boostName} = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            if (userId != undefined) {
                const user = await userController.updateBoost(userId.toString(), boostName);
                res.status(200).json(user);
            }
        } catch (error) {
            res.status(400).json({message: error});
        }
    });

    return router;
}

export default userRouter;

