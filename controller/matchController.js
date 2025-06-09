const User = require("../model/user");

const submitStyleQuiz = async (req, res) => {
  const { userId, answers } = req.body;

  if (!userId || !answers) {
    return res.status(400).json({ message: "Missing userId or answers." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.style_quiz = answers;
    await user.save();

    // MATCHING LOGIC
    const designers = await User.find({ role: "designer" });

    const quizStyle = answers["2"]; // preferred style
    const quizTone = answers["4"];
    const quizFunction = answers["5"];

    const bestMatch = designers.find((designer) => {
      return (
        designer.specialization &&
        designer.specialization.toLowerCase().includes(quizStyle?.toLowerCase())
      );
    });

    res.status(200).json({
      message: "Quiz submitted and match found",
      user,
      match: bestMatch || null,
    });
  } catch (error) {
    console.error("Error in style quiz submission:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { submitStyleQuiz };
