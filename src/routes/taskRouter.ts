import express from "express";
import UserController from "../controllers/userController";

const router = express.Router();

function taskRouter(userController: UserController) {


    router.post('/createTask', async (req, res) => {
        try {
            const { text, coins, checkIcon, taskType, type } = req.body;
            const task = await userController.addTaskToAllUsers(text, coins, checkIcon, taskType, type);
            res.status(200).json(task);
        } catch (error) {
            res.status(400).json({ message: error });

        }
    });

    router.patch('/updateTaskCompletion', async (req, res) => {
        try {
            const { userId, taskId, completed } = req.body;
            await userController.updateTaskCompletion(userId, taskId, completed);
            res.status(200).json({ message: 'Task completion status updated successfully' });
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });


    router.get('/getAllTasks', async (req, res) => {
        try {
            const task = await userController.getAllTasks();
            res.status(200).json(task);
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    router.post('/updateTask', async (req, res) => {
        try {
            const { taskId, updatedFields } = req.body;
            await userController.updateTask(taskId, updatedFields);
            const updatedTask = await userController.getTaskById(taskId);
            if (updatedTask) {
                res.status(200).json(updatedTask);
            } else {
                res.status(404).json({ message: 'Task not found' });
            }
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    router.delete('/deleteTask', async (req, res) => {
        try {
            const { taskId } = req.body;
            await userController.deleteTask(taskId);
            res.status(200).json({ message: 'Task deleted successfully' });
        } catch (error) {
            res.status(400).json({ message: error });
        }
    });

    return router;

}

export default taskRouter;