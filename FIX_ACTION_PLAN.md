# План исправлений stenBitBackEnd

## 🚨 Критические исправления (День 1)

### 1. Исправление ошибок компиляции TypeScript

#### Проблема: Отсутствующий тип InitDataParsed
**Файлы:** `src/auth/authFromCode.ts`, `src/auth/authMiddleware.ts`, etc.

**Решение A (Рекомендуемое):**
```bash
# Проверить доступные типы в пакете
npm ls @telegram-apps/init-data-node
# Обновить до последней версии
npm update @telegram-apps/init-data-node
```

**Решение B (Временное):**
Создать файл `src/types/telegram.d.ts`:
```typescript
export interface InitDataParsed {
  user?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    allows_write_to_pm?: boolean;
  };
  receiver?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  chat?: {
    id: number;
    type: string;
    title?: string;
    username?: string;
  };
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  query_id?: string;
  auth_date: number;
  hash: string;
}
```

Обновить импорты:
```typescript
// Заменить во всех файлах
import { validate, parse, type InitDataParsed } from '@telegram-apps/init-data-node';
// На:
import { validate, parse } from '@telegram-apps/init-data-node';
import { InitDataParsed } from '../types/telegram';
```

### 2. Удаление дублирования маршрутов

**Файл:** `src/index.ts`
```typescript
// Строка 40 - УДАЛИТЬ эту строку
// app.use('/api/prem', premiumRouter(premiumController))
```

### 3. Быстрое исправление security vulnerabilities

```bash
cd /path/to/project
npm audit fix --force
```

## 🔧 Срочные исправления (Дни 2-3)

### 1. Обновление критических зависимостей

```bash
# Обновить Express
npm install express@^4.21.0

# Обновить Multer (BREAKING CHANGE)
npm install multer@^2.0.0
# Потребует обновления кода загрузки файлов

# Обновить Telegram Bot API
npm update node-telegram-bot-api
```

### 2. Исправление кода для Multer 2.x

**Файл:** `src/controllers/imageController.ts`
```typescript
// Старый код (Multer 1.x)
import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Новый код (Multer 2.x)
import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
```

### 3. Создание конфигурационных шаблонов

**Файл:** `param.env.example`
```env
# Telegram Bot Configuration
MY_SECRET_TOKEN=your_telegram_bot_token_here

# Database Configuration  
user=your_database_username
password=your_database_password
database=your_database_name

# Server Configuration
NODE_ENV=development
PORT=3000
```

**Файл:** `tokens.json.example`
```json
{
  "tokens": [
    "example_token_1", 
    "example_token_2"
  ]
}
```

## 🛠️ Важные улучшения (Неделя 1)

### 1. Добавление базовой обработки ошибок

**Файл:** `src/middleware/errorHandler.ts`
```typescript
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`Error ${statusCode}: ${message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal Server Error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### 2. Улучшение валидации входных данных

**Файл:** `src/middleware/validation.ts`
```typescript
import { Request, Response, NextFunction } from 'express';

export const validateCreateTask = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { text, coins, checkIcon, taskType, type } = req.body;

  const errors: string[] = [];

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    errors.push('Text is required and must be a non-empty string');
  }

  if (!coins || typeof coins !== 'number' || coins <= 0) {
    errors.push('Coins must be a positive number');
  }

  if (!checkIcon || typeof checkIcon !== 'string') {
    errors.push('CheckIcon is required and must be a string');
  }

  if (!taskType || typeof taskType !== 'string') {
    errors.push('TaskType is required and must be a string');
  }

  if (!type || typeof type !== 'string') {
    errors.push('Type is required and must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};
```

### 3. Улучшение конфигурации TypeScript

**Файл:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "typeRoots": ["./node_modules/@types", "./src/types"],
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## 📋 Тестирование (Неделя 2)

### 1. Настройка Jest

```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

**Файл:** `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};
```

### 2. Пример Unit теста

**Файл:** `src/service/__tests__/UserService.test.ts`
```typescript
import { UserService } from '../UserService';

describe('UserService', () => {
  let userService: UserService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      execute: jest.fn()
    };
    userService = new UserService(mockDb);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        userId: '123',
        userName: 'testuser',
        address: 'test_address'
      };

      mockDb.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const result = await userService.createUser(userData);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );
      expect(result).toBeDefined();
    });

    it('should throw error if user creation fails', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        userService.createUser({
          userId: '123',
          userName: 'testuser', 
          address: 'test_address'
        })
      ).rejects.toThrow('DB Error');
    });
  });
});
```

## 🚀 CI/CD Setup (Неделя 2-3)

### 1. GitHub Actions

**Файл:** `.github/workflows/ci.yml`
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: testdb
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint
      
    - name: Run tests
      run: npm test
      env:
        NODE_ENV: test
        DATABASE_HOST: localhost
        DATABASE_USER: root
        DATABASE_PASSWORD: test
        DATABASE_NAME: testdb
        
    - name: Build project
      run: npm run build
      
    - name: Run security audit
      run: npm audit --audit-level moderate

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 2. ESLint и Prettier

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
```

**Файл:** `.eslintrc.js`
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

## 🔍 Мониторинг и логирование (Неделя 3-4)

### 1. Winston Logger

```bash
npm install winston
```

**Файл:** `src/utils/logger.ts`
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'stenbit-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### 2. Health Check Endpoint

**Файл:** `src/routes/healthRouter.ts`
```typescript
import express from 'express';
import { Connection } from 'mysql2/promise';

export default function healthRouter(db: Connection) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      // Database health check
      await db.execute('SELECT 1');
      
      // Memory usage check
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      };

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        memory: memoryUsageMB,
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
```

## 📊 Чеклист выполнения

### Критические (День 1):
- [ ] Исправить TypeScript ошибки компиляции
- [ ] Удалить дублирование маршрутов
- [ ] Запустить `npm audit fix`
- [ ] Создать шаблоны конфигурационных файлов

### Срочные (Дни 2-3):
- [ ] Обновить критические зависимости
- [ ] Исправить код для Multer 2.x
- [ ] Добавить базовую обработку ошибок
- [ ] Настроить валидацию входных данных

### Важные (Неделя 1):
- [ ] Улучшить конфигурацию TypeScript
- [ ] Добавить ESLint и Prettier
- [ ] Настроить базовое логирование
- [ ] Добавить health check endpoint

### Тестирование (Неделя 2):
- [ ] Настроить Jest
- [ ] Написать unit тесты для сервисов
- [ ] Написать integration тесты для API
- [ ] Достичь покрытия тестами 80%+

### CI/CD (Неделя 2-3):
- [ ] Настроить GitHub Actions
- [ ] Добавить автоматические тесты
- [ ] Настроить security scanning
- [ ] Добавить автоматический деплой

### Мониторинг (Неделя 3-4):
- [ ] Настроить Winston logger
- [ ] Добавить метрики производительности
- [ ] Настроить алерты
- [ ] Добавить дашборд мониторинга

## 🎯 Результат

После выполнения всех пунктов проект будет:
- ✅ Успешно компилироваться
- ✅ Безопасен для продакшена  
- ✅ Покрыт тестами
- ✅ Иметь автоматические проверки
- ✅ Готов к мониторингу в продакшене