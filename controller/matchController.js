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
      const traits = [];

      if (answers["2"]) {
        traits.push(`You resonate with a ${answers["2"]} style, often reflecting strong aesthetic identity.`);
      }

      if (answers["3"] === "Calm and simple") {
        traits.push("You prefer calm and subtle design choices, suggesting a minimalist and serene atmosphere.");
      } else if (answers["3"] === "Bold and unique") {
        traits.push("You enjoy bold, standout elements — you're not afraid to experiment.");
      } else {
        traits.push("You appreciate both bold accents and calm harmony.");
      }

      if (answers["4"]) {
        traits.push(`Your preference for ${answers["4"]} shows your natural color inclination — warm, cool, or vibrant.`);
      }

      if (answers["5"]?.toLowerCase().includes("functional")) {
        traits.push("You prioritize functionality and efficient use of space.");
      } else if (answers["5"]?.toLowerCase().includes("decorative")) {
        traits.push("You lean toward aesthetic beauty over practicality.");
      } else {
        traits.push("You seek a balance between design and utility.");
      }

      if (answers["6"] === "Flexible, as long as it's perfect") {
        traits.push("You're patient and care more about perfection than speed.");
      } else {
        traits.push(`You'd like the project completed ${answers["6"].toLowerCase()}, which shows your timing preference.`);
      }

      if (answers["7"]) {
        traits.push(`Your selected budget range (${answers["7"]}) gives insight into your investment comfort for this project.`);
      }

      return traits.join(" ");
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
