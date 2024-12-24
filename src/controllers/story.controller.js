import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const postStory = asyncHandler(async (req, res) => {
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


const getStory = asyncHandler(async (req, res) => {
    try {
        const story = await Story.aggregate([
            {
                $sort: { createdAt: -1 }, // Sort posts in reverse order
            },
            {
                $lookup: { // Join User collection
                    from: "users",
                    localField: "storyOwner", // The field in Post referring to User
                    foreignField: "_id", // The field in User being referred to
                    as: "userDetails", // Output array field for user data
                },
            },
            {
                $unwind: "$userDetails", // Flatten the userDetails array
            },
            {
                $project: { // Select necessary fields
                    _id: 1,
                    postFile: 1,
                    description: 1,
                    likes: 1,
                    storyOwner: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    viewers: 1,
                    username: "$userDetails.username",
                    fullName: "$userDetails.fullName",
                    avatar: "$userDetails.avatar",
                },
            },
        ]);

        if (!story || story.length === 0) {
            throw new ApiError(404, "No posts found");
        }


        return res.status(200).json(
            new ApiResponse(200, story, "Story retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, "An error occured")
    }
});



import mongoose from "mongoose";

const deleteStory = asyncHandler(async (req, res) => {
    try {
        const { storyId } = req.params;

        // Validate the storyId
        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            throw new ApiError(400, "Invalid Story ID.");
        }

        // Check if the story exists
        const story = await Story.findById(storyId);
        if (!story) {
            throw new ApiError(404, "Story not found.");
        }

        // Check if the story belongs to the authenticated user
        if (String(story.storyOwner) !== String(req.user.id)) {
            throw new ApiError(403, "You are not authorized to delete this story.");
        }

        // Delete from Cloudinary
        const { postFilePublicId } = story;
        if (postFilePublicId) {
            const cloudinaryResult = await deleteFromCloudinary(postFilePublicId);
            if (!cloudinaryResult.success) {
                throw new ApiError(500, "Failed to delete story file from Cloudinary.");
            }
        }

        // Delete from database
        await Story.deleteOne({ _id: storyId });

        return res.status(200).json(
            new ApiResponse(200, {}, "Story deleted successfully.")
        );
    } catch (error) {
        console.error("Error in deleteStory:", error);
        return res.status(500).json(
            new ApiResponse(500, {}, "Error in deleteStory.")
        );
    }
});


import { v2 as cloudinary } from "cloudinary";
// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const deleteFromCloudinary = async (publicId) => {
    try {
        // console.log("Public ID to delete:", publicId);
        const result = await cloudinary.uploader.destroy(publicId);
        // console.log("Cloudinary response:", result);
        return { success: true, result };
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error);
        return { success: false, error };
    }
};



export {
    postStory,
    getStory,
    deleteStory
}