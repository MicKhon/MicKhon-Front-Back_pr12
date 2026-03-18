const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const User = require('./models/user');
const Product = require('./models/product');
const { authMiddleware, roleMiddleware, ACCESS_SECRET } = require('./middleware/auth');
const loggerMiddleware = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh_secret_key';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

const users = [];
const products = [];
const refreshTokens = new Set();

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(loggerMiddleware);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JWT Auth API with RBAC',
      version: '1.0.0',
      description: 'API с JWT, Refresh токенами и RBAC (Практика №11)',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Локальный сервер',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [process.cwd() + '/src/app.js'], // ✅ Абсолютный путь
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Utility functions
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function findUserByEmail(email) {
  return users.find(u => u.email === email && !u.isDeleted);
}

function findUserById(id) {
  return users.find(u => u.id === id && !u.isDeleted);
}

function findProductById(id) {
  return products.find(p => p.id === id);
}

function generateAccessToken(user) {
  return jwt.sign(
    { 
      sub: user.id, 
      email: user.email, 
      first_name: user.first_name,
      role: user.role
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { 
      sub: user.id, 
      email: user.email,
      role: user.role
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// ==================== AUTH ROUTES ====================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               age:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Пользователь создан
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, age, role } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ 
        error: 'Required fields are missing',
        required: ['email', 'password', 'first_name', 'last_name']
      });
    }

    if (findUserByEmail(email)) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const user = new User({ 
      email, 
      first_name, 
      last_name, 
      passwordHash, 
      age, 
      role: role || 'user' 
    });
    
    users.push(user);
    console.log(`✅ User registered: ${email} (role: ${user.role})`);
    res.status(201).json(user.toJSON());
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Успешный вход
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // ✅ ВЫВОД ТОКЕНОВ В КОНСОЛЬ СЕРВЕРА (для отладки)
    console.log('\n🔐 ====== LOGIN SUCCESS ======');
    console.log('User:', user.email);
    console.log('Role:', user.role);
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    console.log('=============================\n');
    
    refreshTokens.add(refreshToken);
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      accessToken,
      refreshToken, // ✅ Отправляем refresh токен на клиент
      tokenType: 'Bearer',
      accessTokenExpiresIn: ACCESS_EXPIRES_IN,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Токены обновлены
 */
app.post('/api/auth/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    if (!refreshTokens.has(refreshToken)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    
    const user = findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    refreshTokens.delete(refreshToken);
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    refreshTokens.add(newRefreshToken);

    // ✅ ВЫВОД НОВЫХ ТОКЕНОВ
    console.log('\n🔄 ====== TOKEN REFRESHED ======');
    console.log('New Access Token:', newAccessToken);
    console.log('New Refresh Token:', newRefreshToken);
    console.log('===============================\n');

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: ACCESS_EXPIRES_IN
    });
  } catch (err) {
    console.error('❌ Refresh error:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token has expired' });
    }
    
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить текущего пользователя
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = findUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.toJSON());
  } catch (err) {
    console.error('❌ Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Выход из системы
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Успешный выход
 */
app.post('/api/auth/logout', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
    console.log('🚪 User logged out, token removed');
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// ==================== USERS ROUTES (Admin Only) ====================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить всех пользователей (Только админ)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 */
app.get('/api/users', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const allUsers = users.filter(u => !u.isDeleted).map(u => u.toJSON());
    res.json(allUsers);
  } catch (err) {
    console.error('❌ Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по ID (Только админ)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Данные пользователя
 */
app.get('/api/users/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.toJSON());
  } catch (err) {
    console.error('❌ Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить пользователя (Только админ)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Пользователь обновлён
 */
app.put('/api/users/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { email, first_name, last_name, age, role } = req.body;
    if (email) user.email = email;
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (age) user.age = age;
    if (role) user.role = role;

    res.json(user.toJSON());
  } catch (err) {
    console.error('❌ Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя (Только админ)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Пользователь заблокирован
 */
app.delete('/api/users/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isDeleted = true;
    res.status(204).send();
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PRODUCTS ROUTES (RBAC) ====================

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар (Продавец/Админ)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - price
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post('/api/products', authMiddleware, roleMiddleware('seller', 'admin'), (req, res) => {
  try {
    const { title, category, description, price } = req.body;

    if (!title || !category || price === undefined) {
      return res.status(400).json({ 
        error: 'Required fields are missing',
        required: ['title', 'category', 'price']
      });
    }

    const product = new Product({ title, category, description, price });
    products.push(product);
    console.log(`✅ Product created: ${product.title}`);
    res.status(201).json(product);
  } catch (err) {
    console.error('❌ Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить все товары
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get('/api/products', (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 */
app.get('/api/products/:id', authMiddleware, (req, res) => {
  try {
    const product = findProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('❌ Get product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар (Продавец/Админ)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Товар обновлён
 */
app.put('/api/products/:id', authMiddleware, roleMiddleware('seller', 'admin'), (req, res) => {
  try {
    const product = findProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { title, category, description, price } = req.body;
    product.update({ title, category, description, price });
    res.json(product);
  } catch (err) {
    console.error('❌ Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар (Только админ)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар удалён
 */
app.delete('/api/products/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    products.splice(index, 1);
    res.status(204).send();
  } catch (err) {
    console.error('❌ Delete product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`🔐 Access token expires: ${ACCESS_EXPIRES_IN}`);
  console.log(`🔄 Refresh token expires: ${REFRESH_EXPIRES_IN}`);
  console.log(`👥 RBAC enabled: user, seller, admin`);
});

module.exports = app;