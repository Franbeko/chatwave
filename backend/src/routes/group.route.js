import express from "express";
import {
  createGroup,
  getUserGroups,
  getGroupDetails,
  sendGroupMessage,
  getGroupMessages,
  addGroupMember,
  removeGroupMember,
  updateGroup
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Group CRUD
router.post("/", createGroup);
router.get("/", getUserGroups);
router.get("/:groupId", getGroupDetails);
router.put("/:groupId", updateGroup);

// Group messages
router.post("/:groupId/messages", sendGroupMessage);
router.get("/:groupId/messages", getGroupMessages);

// Group members
router.post("/:groupId/members", addGroupMember);
router.delete("/:groupId/members", removeGroupMember);

export default router;