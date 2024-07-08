import express, { Request, Response } from 'express';
import UserController from '../controllers/userController';

const router = express.Router();

function userRouter(userController: UserController) {
    router.post('/', async (req: Request, res: Response) => {
        const { userId, userName, coins, address } = req.body;
        try {
            const user = await userController.createUser(userId, userName, coins, address);
            res.status(201).json(user);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    router.get('/:userId', async (req: Request, res: Response) => {
        const userId = req.params.userId;
        try {
            const user = await userController.getUserFromId(userId);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
            } else {
                res.status(200).json(user);
            }
        } catch (error) {
            console.error('Ошибка при обновлении буста:', error);
            res.status(400).json({ message: error });
        }
    });

    router.put('/:userId', async (req: Request, res: Response) => {
        const userId = req.params.userId;
        try {
            const updatedUser = await userController.updateUser(userId, req.body);
            res.status(200).json(updatedUser);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    router.post('/process-invitation', async (req: Request, res: Response) => {
        const { inviteCode, newUserId, newUserName } = req.body;
        try {
            const newUser = await userController.processInvitation(inviteCode, newUserId, newUserName);
            res.status(201).json(newUser);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });


    router.post('/processInvitation', async (req, res) => {
        try {
            const { inviteCode, newUserId, newUserName } = req.body;
            const user = await userController.processInvitation(inviteCode, newUserId, newUserName);
            res.status(201).json(user);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    router.post('/updateBoost', async (req, res) => {
        try {
            const { userId, boostName } = req.body;
            const user = await userController.updateBoost(userId, boostName);
            res.status(200).json(user);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });


    return router;
}

export default userRouter;

