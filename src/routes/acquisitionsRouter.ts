import express from "express";
import {authFromCode} from "../auth/authFromCode";
import AcquisitionsController from "../controllers/acquisitionsController";
import {authMiddleware} from "../auth/authMiddleware";
import {InitDataParsed} from "@telegram-apps/init-data-node";


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


    router.post('/checkTonTransfer', authMiddleware, async (req, res) => {
        try {
            const {amount} = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            if(userId) {
                const walletReseiverTest = '0QD_4qEt5T0D5-J1X2HEIU5CRFKmH4qZErVHaweyJGZncWOD'
                const walletReseivermain = "UQAL2GStuOezf07vYJkdtfJaZBgxkkS0Ukg0AN6CJNTO9mSC"
                const resultrequest = await acquisitionsController.checkOutTransferTone(userId.toString(), amount, walletReseivermain)
                if (resultrequest) {
                    res.status(200).json({resultrequest: resultrequest});
                } else {
                    res.status(404).json({message: 'resultrequest'});
                }
            }
        } catch (e) {

        }
    })


    return router;
}

export default acquisitionsRouter;
