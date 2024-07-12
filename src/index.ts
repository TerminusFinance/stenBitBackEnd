// index.ts

import express from 'express';
import { connectDatabase } from './db';
import userRouter from "./routes/userRoutes";
import UserController from "./controllers/userController";
import leagueRouter from "./routes/leagueRouter";
import LeagueController from "./controllers/leagueController";
import taskRouter from "./routes/taskRouter";
import cors from 'cors';
import adminsRouter from "./routes/adminsRouter";
import AdminsController from "./controllers/adminsController";

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

connectDatabase().then(db => {
    const userController = new UserController(db);
    const leagueController = new LeagueController(db);
    const adminsController = new AdminsController(db);
    app.use('/users', userRouter(userController));
    app.use('/leagues', leagueRouter(leagueController));
    app.use('/task', taskRouter(userController));
    app.use('/adm', adminsRouter(adminsController));

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch(error => {
    console.error('Failed to connect to the database', error);
});


// const app = express();
// const port = 3000;
//
// (async () => {
//     try {
//         const db = await connectDatabase(); // Подключаемся к базе данных
//
//         app.use(express.json());
//         app.use('/tasks', taskRouter(db)); // Передаем объект базы данных в маршрутизатор задач
//
//         app.listen(port, () => {
//             console.log(`Server is running on port ${port}`);
//         });
//     } catch (error) {
//         console.error('Error starting the server:', error);
//     }
// })();



// const app = express();
// const port = 3000;

// app.use(express.json());
//
// app.use('/api', userRoutes);
//
// app.listen(port, () => {
//     console.log(`Server is running at http://localhost:${port}`);
// });
