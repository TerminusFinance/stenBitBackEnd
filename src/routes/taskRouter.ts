import express from "express";
import UserController from "../controllers/userController";
import {authMiddleware} from "../auth/authMiddleware";
import {InitDataParsed} from "@telegram-apps/init-data-node";
import TaskController from "../controllers/userController";
import {authFromCode} from "../auth/authFromCode";

const router = express.Router();

function taskRouter(taskController: TaskController) {

    router.post('/createTask', authFromCode, async (req, res) => {
        try {
            const { text, coins, checkIcon, taskType, type, sortLocal} = req.body;
            const task = await taskController.addTaskToAllUsers(text, coins, checkIcon, taskType, type, sortLocal);
            res.status(200).json(task);
        } catch (error) {
            res.status(400).json({ message: error });

        }
    });

    router.patch('/updateTaskCompletion', authMiddleware, async (req, res) => {
        try {
            const { taskId, completed } = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id
            if(userId != undefined) {
                await taskController.updateTaskCompletion(userId.toString(), taskId, completed);
                res.status(200).json({ message: 'Task completion status updated successfully' });
            }
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });


    router.get('/getAllTasks', async (req, res) => {
        try {
            const task = await taskController.getAllTasks();
            res.status(200).json(task);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    router.post('/updateTask', authFromCode,async (req, res) => {
        try {
            const { taskId, updatedFields } = req.body;
            await taskController.updateTask(taskId, updatedFields);
            const updatedTask = await taskController.getTaskById(taskId);
            if (updatedTask) {
                res.status(200).json(updatedTask);
            } else {
                res.status(404).json({ message: 'Task not found' });
            }
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    router.delete('/deleteTask', authFromCode, async (req, res) => {
        try {
            const { taskId } = req.body;
            await taskController.deleteTask(taskId);
            res.status(200).json({ message: 'Task deleted successfully' });
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    router.post('/checkSuccessTask', authMiddleware, async (req, res) => {
        try {
            const { taskId } = req.body;
            const initData = res.locals.initData as InitDataParsed;
            const userId = initData.user?.id;

            if (userId != undefined) {
                const result = await taskController.checkSuccessTask(userId.toString(), taskId);
                if (typeof result === 'string') {
                    res.status(400).json({ message: result });
                } else {
                    res.status(200).json(result);
                }
            } else {
                res.status(400).json({ message: 'User ID not found' });
            }
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    return router;
}

export default taskRouter;