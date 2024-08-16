import express from "express";
import CoinProgressLevelController from "../controllers/coinProgressLevelController";
import {authMiddleware} from "../auth/authMiddleware";
import {InitDataParsed} from "@telegram-apps/init-data-node";
import {authFromCode} from "../auth/authFromCode";

const router = express.Router();

function CoinProgressLevelRouter(coinProgressLevelController: CoinProgressLevelController) {

    router.get('/getCoinsByUser', authMiddleware, async (req, res) => {
        try {
            const initData = res.locals.initData as InitDataParsed;
            const id = initData.user?.id
            if (id != undefined) {
                const resultPrem = await coinProgressLevelController.getUserCoinsProgressLevel(id.toString());
                res.status(200).json(resultPrem);
            } else {
                res.status(404).json({message: 'Not found'});
            }
        } catch (e) {
            console.error(e)
            res.status(400).json({message: e});
        }
    })

    router.get('/getAllCoinsLevel', authMiddleware, async (req, res) => {
        try {
            const initData = res.locals.initData as InitDataParsed;
            const id = initData.user?.id
            if (id != undefined) {
                const resultPrem = await coinProgressLevelController.getAllCoinProgressLevels();
                res.status(200).json(resultPrem);
            } else {
                res.status(404).json({message: 'Not found'});
            }
        } catch (e) {
            console.error(e)
            res.status(400).json({message: e});
        }
    })

    router.post('/createCoinLevel', authFromCode, async (req, res) => {
        try {
            const {levelName, description, price} = req.body;
            const result = await coinProgressLevelController.createCoinsProgressLevel(levelName, description, price);
            res.status(200).json(result)
        } catch (e) {
            console.error(e)
            res.status(400).json({message: e});
        }
    })

    router.post('/upLvl', authMiddleware, async (req, res) => {
        try {
            const initData = res.locals.initData as InitDataParsed;
            const id = initData.user?.id
            if (id != undefined) {
                const resultPrem = await coinProgressLevelController.uprateLevelUserCoins(id.toString());
                res.status(200).json(resultPrem);
            } else {
                res.status(404).json({message: 'Not found'});
            }
        } catch (e) {
            console.error(e)
            res.status(400).json({message: e});
        }
    });

    return router;
}

export default CoinProgressLevelRouter;