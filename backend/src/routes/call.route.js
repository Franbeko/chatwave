import express from "express";
import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  getCallStatus,
  initiateGroupCall
} from "../controllers/call.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

// One-on-one calls
router.post("/initiate", initiateCall);
router.post("/:callId/accept", acceptCall);
router.post("/:callId/reject", rejectCall);
router.post("/:callId/end", endCall);
router.get("/:callId/status", getCallStatus);

// Group calls
router.post("/group/initiate", initiateGroupCall);

export default router;