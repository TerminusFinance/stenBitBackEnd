import express from "express";
import TaskController from "../controllers/userController";
import AdminsController from "../controllers/adminsController";
import {authFromCode} from "../auth/authFromCode";


const router = express.Router();


function adminsRouter(adminsController: AdminsController) {

    router.get('/getListAllUsers', authFromCode, async (req, res) => {
        try {
            const task = await adminsController.getAllUsers();
            res.status(200).json(task);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });


    router.post('/deleteUser', authFromCode, async (req, res) => {
        try {
            const {userId} =req.body()

            const result = await adminsController.deleteUserById(userId);
            res.status(200).json("Success delete");
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    return router;

}

export default adminsRouter;