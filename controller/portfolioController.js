const PortfolioPost = require("../model/portforlio-posts");

const createPortfolioPost = async (req, res) => {
    try {
        const { title, room_type, tags, captions = [], primaryIndex = 0 } = req.body;
        const designerId = req.userId || req.body.designer; // Assuming authentication middleware

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
        console.error("Error creating portfolio post:", error);
        res.status(500).json({ message: "Failed to create portfolio post" });
    }
};

module.exports = { createPortfolioPost };
