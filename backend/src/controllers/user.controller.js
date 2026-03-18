import User from "../models/User.js";

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;

    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, // exclude current user
        {
          $or: [
            { fullName: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select("-password")
    .limit(20);

    res.json(users);
  } catch (error) {
    console.error("Error in searchUsers:", error);
    res.status(500).json({ message: "Server error" });
  }
};