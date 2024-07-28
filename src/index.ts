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
import path from "path";
import fs from "fs";
import PremiumController from "./controllers/premiumController";
import premiumRouter from "./routes/premiumRouter";


const app = express();
const port = 3700;

app.use(express.json());
app.use(cors());


connectDatabase().then(db => {
    const userController = new UserController(db);
    const leagueController = new LeagueController(db);
    const adminsController = new AdminsController(db);
    const premiumController = new PremiumController(db);
    app.use('/test/api/users', userRouter(userController));
    app.use('/test/api/leagues', leagueRouter(leagueController));
    app.use('/test/api/task', taskRouter(userController));
    app.use('/test/api/adm', adminsRouter(adminsController));
    app.use('/test/api/prem', premiumRouter(premiumController))
    
    app.get('/api/img/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../uploads', filename);

        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).json({ message: 'File not found' });
        }
    });

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch(error => {
    console.error('Failed to connect to the database', error);
});
