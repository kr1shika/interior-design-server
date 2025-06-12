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

    const designers = await User.find({ role: "designer" });

    const quizStyle = answers["2"]; // interior style
    const quizTone = answers["4"];  // color tones
    const quizFunction = answers["5"]; // functionality

    const scoredDesigners = designers.map((designer) => {
      let score = 0;

      // Style match (specialization)
      if (designer.specialization?.toLowerCase().includes(quizStyle?.toLowerCase())) {
        score += 40;
      }

      // Tone match
      if (
        designer.preferredTones &&
        Array.isArray(designer.preferredTones) &&
        designer.preferredTones.some(tone => tone.toLowerCase() === quizTone?.toLowerCase())
      ) {
        score += 30;
      }

      // Functional/Decorative approach
      if (designer.approach?.toLowerCase() === quizFunction?.toLowerCase()) {
        score += 30;
      }

      return { designer, score };
    });

    function generateStyleAnalysis(answers) {
      const parts = [];

      if (answers["2"]) {
        parts.push(`You like the ${answers["2"]} style.`);
      }

      if (answers["3"] === "Calm and simple") {
        parts.push("You enjoy calm, clean spaces with a peaceful feel.");
      } else if (answers["3"] === "Bold and unique") {
        parts.push("You love bold choices and creative designs.");
      } else {
        parts.push("You enjoy both bold features and peaceful elements.");
      }

      if (answers["4"]) {
        parts.push(`You’re drawn to ${answers["4"]} tones.`);
      }

      if (answers["5"]?.toLowerCase().includes("functional")) {
        parts.push("You prefer designs that are practical and useful.");
      } else if (answers["5"]?.toLowerCase().includes("decorative")) {
        parts.push("You prefer designs that focus on beauty and charm.");
      } else {
        parts.push("You like a mix of usefulness and beauty.");
      }

      if (answers["6"] === "Flexible, as long as it's perfect") {
        parts.push("You’re flexible with time but want it done right.");
      } else {
        parts.push(`You’d prefer the project to be done ${answers["6"].toLowerCase()}.`);
      }

      return parts.join(" ");
    }

    // Sort by highest score
    scoredDesigners.sort((a, b) => b.score - a.score);
    const best = scoredDesigners[0];

    const styleAnalysis = generateStyleAnalysis(answers);

    res.status(200).json({
      message: "Quiz submitted",
      user,
      match: best?.designer || null,
      matchPercentage: best ? best.score : 0,
      styleAnalysis, // ✅ include this
    });


  } catch (error) {
    console.error("Error in style quiz submission:", error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { submitStyleQuiz };
