import express from "express";
import { 
  getAllContacts, 
  getMessagesByUserId, 
  sendMessage, 
  getChatPartners,
  addReaction,
  deleteMessage,
  deleteForEveryone,
  searchMessages,
  saveMissedCall // Add this import
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.get("/search/all", searchMessages);
router.post("/send/:id", sendMessage);
router.post("/:messageId/react", addReaction);
router.post("/missed-call", saveMissedCall); // Add this line
router.delete("/:messageId", deleteMessage);
router.delete("/:messageId/everyone", deleteForEveryone);

export default router;