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


    router.post('/getUsersByLvl', async (req: Request, res: Response) => {
        try {
            const { levels } = req.body;

            if (!levels || !Array.isArray(levels)) {
                return res.status(400).json({ message: 'Invalid levels parameter' });
            }

            const result = await leagueController.getUsersByLeagueLevels(levels);

            res.status(200).json(result);
        } catch (e) {
            console.error("error - ", e)
            res.status(400).json({ message: e });
        }
    });

    return router;
}

export default leagueRouter;
