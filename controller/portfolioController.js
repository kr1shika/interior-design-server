const PortfolioPost = require("../model/portforlio-posts");
const fs = require("fs");
const path = require("path");
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

const deletePortfolioPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const designerId = req.userId;

        console.log("Delete request - PostID:", postId, "DesignerID:", designerId);

        if (!postId) {
            return res.status(400).json({ message: "Post ID is required." });
        }

        if (!designerId) {
            return res.status(401).json({ message: "Authentication required." });
        }

        // Find the post and check if it belongs to the authenticated user
        const post = await PortfolioPost.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Portfolio post not found." });
        }

        console.log("Found post - Designer:", post.designer, "Type:", typeof post.designer);


        const postDesignerId = post.designer ? post.designer.toString() : null;
        const currentUserId = designerId ? designerId.toString() : null;

        if (!postDesignerId || !currentUserId || postDesignerId !== currentUserId) {
            return res.status(403).json({ message: "You can only delete your own posts." });
        }

        // Delete associated image files from the filesystem
        if (post.images && post.images.length > 0) {
            post.images.forEach(image => {
                const imagePath = path.join(__dirname, '..', 'portfolio_uploads', path.basename(image.url));
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        console.log(`✅ Deleted image file: ${imagePath}`);
                    } catch (fileError) {
                        console.error(`❌ Error deleting image file: ${imagePath}`, fileError);
                    }
                }
            });
        }

        // Delete the post from database
        await PortfolioPost.findByIdAndDelete(postId);

        console.log(`✅ Portfolio post deleted: ${postId}`);
        res.status(200).json({ message: "Portfolio post deleted successfully." });
    } catch (error) {
        console.error("❌ Error deleting portfolio post:", error);
        res.status(500).json({ message: "Failed to delete portfolio post.", error: error.message });
    }
};


module.exports = { createPortfolioPost, getUserPortfolioPosts, deletePortfolioPost };
