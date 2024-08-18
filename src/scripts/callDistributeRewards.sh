#!/bin/bash

# Ваш токен авторизации (этот токен должен быть сгенерирован вашим приложением для администратора или другого пользователя с правами доступа)
AUTH_TOKEN="tma KEY_HGJFKDIFJDFJDBNVJ"

# URL вашего API
API_URL="https://wm-mariupol.com/api/userLeague/distributeWeeklyRewards"

# Заголовок авторизации с вашим кастомным значением
AUTH_HEADER="Authorization: tma KEY_HGJFKDIFJDFJDBNVJ"

# Выполнение запроса
curl -X POST "$API_URL" \
-H "$AUTH_HEADER" >> /home/stenBit/develop/back/src/scripts/distribute_rewards.log 2>&1