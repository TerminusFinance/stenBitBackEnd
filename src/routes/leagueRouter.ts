import express, { Request, Response } from 'express';
import leagueController from '../controllers/leagueController';

const router = express.Router();

function leagueRouter(leagueController: leagueController) {
    router.get('/', async (req: Request, res: Response) => {
        try {
            const leagueLevels = await leagueController.getAllLeagueLevels();
            res.status(200).json(leagueLevels);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    return router;
}

export default leagueRouter;
