import express from "express";
import { 
  getAllContacts, 
  getMessagesByUserId, 
  sendMessage, 
  getChatPartners,
  addReaction,
  deleteMessage,
  deleteForEveryone,
  searchMessages // Add this
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.get("/search/all", searchMessages); // Add search route
router.post("/send/:id", sendMessage);
router.post("/:messageId/react", addReaction);
router.delete("/:messageId", deleteMessage); // For self-deletion
router.delete("/:messageId/everyone", deleteForEveryone); // For everyone deletion

export default router;