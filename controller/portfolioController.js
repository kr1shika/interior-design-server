const PortfolioPost = require("../model/portforlio-posts");

const createPortfolioPost = async (req, res) => {
    try {
        const { title, room_type, tags, captions = [], primaryIndex = 0 } = req.body;
        const designerId = req.userId || req.body.designer;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No images uploaded." });
        }

        const images = req.files.map((file, index) => ({
            url: `/portfolio_uploads/${file.filename}`,
            caption: captions[index] || "",
            is_primary: index === Number(primaryIndex),
        }));

        const post = new PortfolioPost({
            designer: designerId,
            title,
            room_type,
            tags: Array.isArray(tags) ? tags : [tags],
            images,
        });

        await post.save();
        res.status(201).json({ message: "Portfolio post created", post });
    } catch (error) {
        console.error("❌ Error creating portfolio post:", error); // <- this will help a lot
        res.status(500).json({ message: "Failed to create portfolio post", error: error.message });
    }
};

const getUserPortfolioPosts = async (req, res) => {
    try {
        const designerId = req.userId || req.params.designerId;

        if (!designerId) {
            return res.status(400).json({ message: "Designer ID is required." });
        }

        const posts = await PortfolioPost.find({ designer: designerId }).sort({ createdAt: -1 });

        res.status(200).json({ posts });
    } catch (error) {
        console.error("Error fetching portfolio posts:", error);
        res.status(500).json({ message: "Failed to fetch portfolio posts." });
    }
};



module.exports = { createPortfolioPost, getUserPortfolioPosts };
