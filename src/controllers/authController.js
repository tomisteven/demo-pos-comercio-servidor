const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Autenticar usuario y obtener token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.activo && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Email o contraseña inválidos o usuario inactivo' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// @desc    Obtener perfil del usuario logueado
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// @desc    Actualizar perfil del usuario logueado (nombre, email y/o contraseña)
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const { nombre, email, password } = req.body;

    if (nombre !== undefined) {
      const nombreLimpio = String(nombre).trim();
      if (!nombreLimpio) return res.status(400).json({ message: 'El nombre no puede estar vacío' });
      user.nombre = nombreLimpio;
    }

    if (email !== undefined) {
      const emailLimpio = String(email).trim().toLowerCase();
      if (!emailLimpio) return res.status(400).json({ message: 'El email no puede estar vacío' });
      const existe = await User.findOne({ email: emailLimpio, _id: { $ne: user._id } });
      if (existe) return res.status(400).json({ message: 'Ese email ya está en uso por otro usuario' });
      user.email = emailLimpio;
    }

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      user.password = String(password); // el hook pre('save') la hashea
    }

    const updated = await user.save();

    res.json({
      _id: updated._id,
      nombre: updated.nombre,
      email: updated.email,
      rol: updated.rol,
    });
  } catch (error) {
    console.error('Error updateProfile:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
};

// @desc    Desloguear usuario / logout (se maneja en cliente limpiando el token, pero dejamos el endpoint por si hay logica extra)
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = (req, res) => {
  // Cuando se usa JWT el logout real se hace en el cliente borrando el token de localStorage/Cookies
  res.json({ message: 'Sesión cerrada exitosamente' });
};

module.exports = {
  loginUser,
  getUserProfile,
  updateProfile,
  logoutUser,
};
