import { Router } from "express";
import {
  getAllUsers,
  getCurrentUser,
  updateCurrentUser,
  updateUserRole,
  updateUserById,
  deleteUserById,
  createUser,
  askAI,
} from "../../controllers/users.controller.js";
import { loginUser, logoutUser } from "../../controllers/auth.controller.js";
import { authUser } from "../../middlewares/authUser.js";
import { requireAdmin } from "../../middlewares/authRole.js";

export const router = Router();

/**
 * Users Routes
 * สถาปัตยกรรม: Route -> Middleware -> Controller
 */

// GET /users (getAllUsers)
router.get("/", getAllUsers);

// POST /users (createUser)
router.post("/", createUser);

// POST /users/ask-ai (RAG Vector Search with Gemini)
router.post(["/ask-ai", "/ai/ask"], askAI);

// GET /users/me (getCurrentUser)
router.get(["/me", "/auth", "/auth/me"], authUser, getCurrentUser);

// PATCH /users/me (updateCurrentUser)
router.patch("/me", authUser, updateCurrentUser);

// PATCH /users/:userId/role (updateUserRole - Admin Only)
router.patch("/:userId/role", authUser, requireAdmin, updateUserRole);

// PATCH /users/:userId (updateUserById - Admin Only)
router.patch("/:userId", authUser, requireAdmin, updateUserById);

// PUT /users/:id (updateUserById - รองรับ Dashboard เดิม)
router.put("/:id", updateUserById);

// DELETE /users/:userId (deleteUserById)
router.delete(["/:userId", "/:id"], deleteUserById);

// Login & Logout helpers (backward compatibility)
router.post("/login", loginUser);
router.post("/logout", logoutUser);