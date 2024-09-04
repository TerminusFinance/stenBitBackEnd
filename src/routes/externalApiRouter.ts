import express from "express";
import ExternalApiController from "../controllers/externalApiController";


const router = express.Router();

function externalApiRouter(externalApiController: ExternalApiController) {


    router.get('/checkUserStartOnly', async (req, res) => {
        try {
            // Извлекаем параметры из запроса и приводим их к строке
            const token = req.query.token as string | undefined;
            const id = req.query.id as string | undefined;
            const refId = req.query.refId as string | undefined;

            // Проверка наличия всех обязательных параметров
            if (!token || !id || !refId) {
                return res.status(400).json({ error: 'Missing required query parameters' });
            }

            // Вызов функции контроллера
            const result = await externalApiController.checkUserStart(token, id, refId);

            // Возвращаем результат в ответе
            res.json(result);
        } catch (e) {
            console.error('Ошибка при обработке запроса:', e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });



    module.exports = router;


    return router
}

export default externalApiRouter