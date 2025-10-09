const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Obtener token del header
  const token = req.header('Authorization');

  // Verificar si no hay token
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'No hay token, autorización denegada' 
    });
  }

  try {
    // Extraer el token sin el 'Bearer '
    const actualToken = token.substring(7);
    
    // Verificar token
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    
    // Agregar usuario a la request
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Token inválido' 
    });
  }
};

module.exports = authMiddleware;