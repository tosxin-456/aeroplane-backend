const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

// Routes
router.post("/", userController.createUser);
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getSingleUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.post("/login", userController.loginUser);


module.exports = router;
