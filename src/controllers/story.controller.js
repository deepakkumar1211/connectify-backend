import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const postStatus = asyncHandler(async (req, res) => {
    try {
        const { description, visibility } = req.body;

        // Check if the authenticated user's ID is available
        const ownerId = req.user?.id;
    
        if (!ownerId) {
            throw new ApiError(400, "Owner (user ID) is required.");
        }
    
        // Validate user existence
        const userExists = await User.findById(ownerId);
        if (!userExists) {
            throw new ApiError(404, "User not found.");
        }
    
        // Optional: Validate visibility
        const allowedVisibility = ["public", "friends", "private"];
        if (visibility && !allowedVisibility.includes(visibility)) {
            throw new ApiError(400, "Invalid visibility option.");
        }
    
        // Validate uploaded file
        const fileBuffer = req.file?.buffer;
        if (!fileBuffer) {
            throw new ApiError(400, "Post file is required");
        }

        // Upload file to Cloudinary
        const postfile = await uploadOnCloudinary(fileBuffer, req.file.mimetype); // Ensure Cloudinary handles the buffer and mimetype

        if (!postfile || !postfile.url) {
            throw new ApiError(500, "Failed to upload the post file to Cloudinary");
        }
    
        // Create the status
        const story = await Story.create({
            storyOwner: ownerId,
            postFile: postfile.url,
            description,
            postFilePublicId: postfile.public_id,
            visibility: visibility || "public", // Default to "public" visibility
        });
    
        // Retrieve the created status
        const createdStatus = await Story.findById(story._id);
        if (!createdStatus) {
            throw new ApiError(500, "Something went wrong while creating the story.");
        }
    
        return res.status(201).json(
            new ApiResponse(201, createdStatus, "Your story has been posted successfully.")
        );
        } catch (error) {
        console.error("Error in createStory:", error);
        return res.status(500).json(
            new ApiResponse(500, {} , "Error in createStory.")
        );
        }
});


export {
    postStatus,
}