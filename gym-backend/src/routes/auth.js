const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Modelo de usuario (simplificado para el dueño del gimnasio)
const Owner = {
  email: 'admin@migym.com',
  password: '$2b$12$VNEz38K4cytyg91uN3b7huNxZVllaEphL76/Vs1qvoN5KKP/5J6hu' // password: admin123
};

// @route   POST /api/auth/login
// @desc    Login del dueño del gimnasio
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son obligatorios'
      });
    }

    // Verificar email
    if (email !== Owner.email) {
      return res.status(400).json({
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, Owner.password);
    
    if (!isMatch) {
      return res.status(400).json({
        error: 'Credenciales inválidas'
      });
    }

    // Crear token JWT
    const payload = {
      user: {
        id: 'owner-id',
        email: Owner.email,
        role: 'owner'
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '30d' } // Token válido por 30 días
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        email: Owner.email,
        role: 'owner'
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// @route   GET /api/auth/verify
// @desc    Verificar token válido
// @access  Private
router.get('/verify', require('../middleware/auth'), (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    user: req.user
  });
});

module.exports = router;