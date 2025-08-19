// routes/userRoutes.js

const express = require("express");
const router = express.Router();

const UserController = require("../controllers/UserController");
const verifyToken = require("../helpers/verify-token");
const { imageUpload } = require("../helpers/image-upload");
const { requireSelfOrAdmin } = require("../helpers/authz");
const { requireRole } = require('../helpers/authz') 

// Auth & leitura
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/checkuser", UserController.checkUser);

// Admin-only (listagem/criação/role/delete)
router.get("/", verifyToken, UserController.list);
router.post("/admin-create", verifyToken, imageUpload.single("image"), UserController.adminCreateUser);
router.patch("/:id/role", verifyToken, UserController.setRole);
router.delete("/:id", verifyToken, UserController.remove);

// ✨ EDITAR PERFIL — self OU admin (RESTful)
router.patch(
  "/:id",
  verifyToken,
  requireSelfOrAdmin("id"),
  imageUpload.single("image"),
  UserController.editUser
);

// (opcional) alias de compatibilidade por um tempo:
router.patch(
  "/edit/:id",
  verifyToken,
  requireSelfOrAdmin("id"),
  imageUpload.single("image"),
  UserController.editUser
);



router.post(
  "/admin-create",
  verifyToken,
  requireRole('admin'),
  imageUpload.single("image"),
  UserController.adminCreateUser
);


// routes/users.js
router.get('/concessionarios', verifyToken, requireRole('admin'), UserController.listConcessionarios)


// Buscar por id (deixe por último entre as GET específicas)
router.get("/:id", UserController.getUserById);

module.exports = router;
