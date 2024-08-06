import PremiumController from "../controllers/premiumController";
import {authMiddleware} from "../auth/authMiddleware";
import express, {Request, Response} from "express";
import {InitDataParsed} from "@telegram-apps/init-data-node";
import {authFromCode} from "../auth/authFromCode";

const router = express.Router();

function premiumRouter(premiumController: PremiumController) {

    router.get('/getListSubscriptionOptions', authMiddleware, async (req, res) => {
        try {
            const result = await premiumController.getListSubscriptionOptions()
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

    router.post('/buyPremium', authMiddleware, async (req: Request, res: Response) => {
        try {
            const {selectedSubscriptionOptions} = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const id = initData.user?.id
            if (id != undefined) {
                const resultPrem = await premiumController.buyPremium(`${id}`, selectedSubscriptionOptions);
                res.status(200).json(resultPrem);
            } else {
                res.status(404).json({message: 'Not found'});
            }
        } catch (error) {
            console.error(error)
            res.status(400).json({message: error});
        }
    });

    router.post('/subscriptionProcessing', authFromCode, async (req, res) => {
        try {
            const {providerPaymentChargeId, totalAmount} = req.body;
            const resultPrem = await premiumController.subscriptionProcessing(providerPaymentChargeId, totalAmount)
            if (resultPrem) {
                res.status(200).json(resultPrem);
            } else {
                res.status(404).json({message: 'Not found'});
            }
        } catch (e) {
            console.error(e)
            res.status(400).json({message: e});
        }
    })


    router.get('/getAllPremiumUsers', authFromCode, async (req, res) => {
        try {
            const result = await premiumController.getAllPremiumUsers()
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

    router.get('/getPremiumUsers', authMiddleware, async (req, res) => {
        try {
            const initData = res.locals.initData as InitDataParsed;
            const id = initData.user?.id
            if (id != undefined) {
                const resultPrem = await premiumController.getPremiumUsers(id.toString());
                res.status(200).json(resultPrem);
            } else {
                res.status(404).json({message: 'Not found'});
            }
        } catch (e) {
            console.error(e)
            res.status(400).json({message: e});
        }
    })

    return router;
}

export default premiumRouter;