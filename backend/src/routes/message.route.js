import express from "express";
import { 
  getAllContacts, 
  getMessagesByUserId, 
  sendMessage, 
  getChatPartners,
  addReaction,
  deleteMessage 
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// the middlewares execute in order
router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);
router.post("/:messageId/react", addReaction); // Add reaction route
router.delete("/:messageId", deleteMessage); // Delete message route

export default router;