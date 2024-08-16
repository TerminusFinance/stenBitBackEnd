import express from "express";
import {authFromCode} from "../auth/authFromCode";
import AcquisitionsController from "../controllers/acquisitionsController";


const router = express.Router();

function acquisitionsRouter(acquisitionsController: AcquisitionsController) {

    router.post('/subscriptionProcessing', authFromCode, async (req, res) => {
        try {
            const {providerPaymentChargeId, totalAmount} = req.body;
            const resultPrem = await acquisitionsController.subscriptionProcessing(providerPaymentChargeId, totalAmount)
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


    return router;
}

export default acquisitionsRouter;
