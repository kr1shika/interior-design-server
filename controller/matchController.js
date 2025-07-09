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

const getUserQuizMatches = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId parameter." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if user has completed the quiz
    if (!user.style_quiz || Object.keys(user.style_quiz).length === 0) {
      return res.status(200).json({
        hasQuizData: false,
        message: "User has not completed the style quiz yet.",
        quizData: null,
        matches: []
      });
    }

    const designers = await User.find({ role: "designer" });
    const answers = user.style_quiz;

    const quizStyle = answers["2"]; // interior style
    const quizTone = answers["4"];  // color tones
    const quizFunction = answers["5"]; // functionality

    // Calculate compatibility scores for all designers
    const scoredDesigners = designers.map((designer) => {
      let score = 0;

      // Style match (specialization) - 40 points
      if (designer.specialization?.toLowerCase().includes(quizStyle?.toLowerCase())) {
        score += 40;
      }

      // Tone match - 30 points
      if (
        designer.preferredTones &&
        Array.isArray(designer.preferredTones) &&
        designer.preferredTones.some(tone => tone.toLowerCase() === quizTone?.toLowerCase())
      ) {
        score += 30;
      }

      // Functional/Decorative approach - 30 points
      if (designer.approach?.toLowerCase() === quizFunction?.toLowerCase()) {
        score += 30;
      }

      return {
        designer: {
          _id: designer._id,
          full_name: designer.full_name,
          email: designer.email,
          profilepic: designer.profilepic,
          bio: designer.bio,
          specialization: designer.specialization,
          experience: designer.experience,
          preferredTones: designer.preferredTones,
          approach: designer.approach,
          availablity: designer.availablity
        },
        score,
        compatibilityPercentage: Math.round((score / 100) * 100)
      };
    });

    // Sort by highest score
    scoredDesigners.sort((a, b) => b.score - a.score);

    // Generate style analysis
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
        parts.push(`You're drawn to ${answers["4"]} tones.`);
      }

      if (answers["5"]?.toLowerCase().includes("functional")) {
        parts.push("You prefer designs that are practical and useful.");
      } else if (answers["5"]?.toLowerCase().includes("decorative")) {
        parts.push("You prefer designs that focus on beauty and charm.");
      } else {
        parts.push("You like a mix of usefulness and beauty.");
      }

      if (answers["6"] === "Flexible, as long as it's perfect") {
        parts.push("You're flexible with time but want it done right.");
      } else {
        parts.push(`You'd prefer the project to be done ${answers["6"].toLowerCase()}.`);
      }

      return parts.join(" ");
    }

    const styleAnalysis = generateStyleAnalysis(answers);

    res.status(200).json({
      hasQuizData: true,
      message: "Quiz data retrieved successfully",
      quizData: answers,
      styleAnalysis,
      matches: scoredDesigners,
      topMatch: scoredDesigners[0] || null,
      totalDesigners: scoredDesigners.length,
      matchingStats: {
        perfectMatches: scoredDesigners.filter(d => d.score >= 90).length,
        goodMatches: scoredDesigners.filter(d => d.score >= 60 && d.score < 90).length,
        fairMatches: scoredDesigners.filter(d => d.score >= 30 && d.score < 60).length,
        lowMatches: scoredDesigners.filter(d => d.score < 30).length
      }
    });

  } catch (error) {
    console.error("Error retrieving user quiz matches:", error);
    res.status(500).json({
      message: "Server error while retrieving quiz matches",
      error: error.message
    });
  }
};

// Function to get style-based designer recommendations without saving quiz
const getStyleRecommendations = async (req, res) => {
  const { style, tones, approach } = req.query;

  if (!style) {
    return res.status(400).json({ message: "Style parameter is required." });
  }

  try {
    const designers = await User.find({ role: "designer" });

    // Calculate compatibility scores based on provided parameters
    const scoredDesigners = designers.map((designer) => {
      let score = 0;

      // Style match (specialization) - 40 points
      if (designer.specialization?.toLowerCase().includes(style.toLowerCase())) {
        score += 40;
      }

      // Tone match - 30 points (if provided)
      if (tones && designer.preferredTones && Array.isArray(designer.preferredTones)) {
        const tonesArray = tones.split(',').map(t => t.trim().toLowerCase());
        if (designer.preferredTones.some(tone =>
          tonesArray.includes(tone.toLowerCase())
        )) {
          score += 30;
        }
      }

      // Approach match - 30 points (if provided)
      if (approach && designer.approach?.toLowerCase() === approach.toLowerCase()) {
        score += 30;
      }

      return {
        designer: {
          _id: designer._id,
          full_name: designer.full_name,
          email: designer.email,
          profilepic: designer.profilepic,
          bio: designer.bio,
          specialization: designer.specialization,
          experience: designer.experience,
          preferredTones: designer.preferredTones,
          approach: designer.approach,
          availablity: designer.availablity
        },
        score,
        compatibilityPercentage: Math.round((score / 100) * 100)
      };
    });

    // Sort by highest score
    scoredDesigners.sort((a, b) => b.score - a.score);

    res.status(200).json({
      message: "Style-based recommendations retrieved",
      searchCriteria: { style, tones, approach },
      recommendations: scoredDesigners,
      totalDesigners: scoredDesigners.length,
      matchingStats: {
        perfectMatches: scoredDesigners.filter(d => d.score >= 90).length,
        goodMatches: scoredDesigners.filter(d => d.score >= 60 && d.score < 90).length,
        fairMatches: scoredDesigners.filter(d => d.score >= 30 && d.score < 60).length,
        lowMatches: scoredDesigners.filter(d => d.score < 30).length
      }
    });

  } catch (error) {
    console.error("Error getting style recommendations:", error);
    res.status(500).json({
      message: "Server error while getting recommendations",
      error: error.message
    });
  }
};

// Function to update user's quiz answers
const updateStyleQuiz = async (req, res) => {
  const { userId } = req.params;
  const { answers } = req.body;

  if (!userId || !answers) {
    return res.status(400).json({ message: "Missing userId or answers." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update quiz answers
    user.style_quiz = { ...user.style_quiz, ...answers };
    await user.save();

    // Get updated matches
    const matchesResponse = await getUserQuizMatches({ params: { userId } }, {
      status: () => ({ json: (data) => data }),
      json: (data) => data
    });

    res.status(200).json({
      message: "Quiz answers updated successfully",
      user: {
        _id: user._id,
        full_name: user.full_name,
        style_quiz: user.style_quiz
      },
      ...matchesResponse
    });

  } catch (error) {
    console.error("Error updating style quiz:", error);
    res.status(500).json({
      message: "Server error while updating quiz",
      error: error.message
    });
  }
};

module.exports = {
  submitStyleQuiz,
  getUserQuizMatches,
  getStyleRecommendations,
  updateStyleQuiz
};
