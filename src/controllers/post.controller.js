import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

// const createPost = asyncHandler(async (req, res) => {
    
//     const {description} = req.body

//     if(!description){
//         throw new ApiError(400, "description is required")
//     }

//     const postLocalPath = req.file?.path;

//     if (!postLocalPath) {
//         throw new ApiError(400, "post file is required22");
//     }

//     const postfile = await uploadOnCloudinary(postLocalPath);

//     if (!postfile) {
//         throw new ApiError(400, "post file is required11");
//     }

//     const post = await Post.create({
//         description,
//         postFile: postfile.url
//     })

//     const createdPost = await Post.findById(post._id).select()

//     if (!createdPost) {
//         throw new ApiError(500, "Something went wrong while creating the post")
//     }

//     return res.status(201).json(
//         new ApiResponse(200, createdPost, "Your post is posted successfully")
//     )
// })


// code for multer.memoryStorage
const createPost = asyncHandler(async (req, res) => {
    const { description } = req.body;

     // Check if the authenticated user's ID is available
     const ownerId = req.user?.id; // Assuming `req.user` is populated via middleware

    if (!ownerId) {
        return res.status(400).json({ message: "Owner (user ID) is required." });
    }

    // Validate user existence
    const userExists = await User.findById(ownerId);
    if (!userExists) {
        return res.status(404).json({ message: "User not found." });
    }

    // Validate description
    if (!description) {
        throw new ApiError(400, "Description is required");
    }

    // Validate uploaded files
    const files = req.files; // Multer adds `req.files` for multiple files
    const mediaUrls = [];

    if (!files) {
        throw new ApiError(400, "Post file is required");
    }

    if (files && files.length > 0) {
            for (const file of files) {
                try {
                    // Upload each file to Cloudinary
                    const uploadedMedia = await uploadOnCloudinary(file.buffer, file.mimetype);

                    if (!uploadedMedia || !uploadedMedia.url) {
                        throw new ApiError(500, "Failed to upload a media file to Cloudinary.")
                    }

                    // Push each uploaded media URL to the mediaUrls array
                    mediaUrls.push(uploadedMedia.url);
                } catch (error) {
                    throw new ApiError(400, "Cloudinary upload failed.")
                }
            }
    } else {
        throw new ApiError(400, "At least one media file is required.")
    }

    // Create the post
    const post = await Post.create({
        description,
        postFile: mediaUrls,
        owner: ownerId
    });

    // Retrieve the created post
    const createdPost = await Post.findById(post._id).select();
    if (!createdPost) {
        throw new ApiError(500, "Something went wrong while creating the post");
    }

    return res.status(201).json(
        new ApiResponse(200, createdPost, "Your post is posted successfully")
    );
});



// const getAllPosts = asyncHandler (async (req, res) => {
//     try {
//         // const posts = await Post.find();
//         const posts = await Post.find().sort({ createdAt: -1 }); // get data in reverse order
//         if (!posts || posts.length === 0) {
//             throw new ApiError(404, "No posts found");
//         }

//         return res
//             .status(200)
//             .json(new ApiResponse(200, posts, "Posts retrieved successfully"));

//     } catch (error) {
//         return res
//             .status(error.statusCode || 500)
//             .json(new ApiResponse(error.statusCode || 500, {}, error.message || "An error occurred"));
//     }
// })


const getAllPosts = asyncHandler(async (req, res) => {
    try {
        const posts = await Post.aggregate([
            {
                $sort: { createdAt: -1 }, // Sort posts in reverse order
            },
            {
                $lookup: { // Join User collection
                    from: "users",
                    localField: "owner", // The field in Post referring to User
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
                    owner: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    username: "$userDetails.username",
                    fullName: "$userDetails.fullName",
                    avatar: "$userDetails.avatar",
                },
            },
        ]);

        if (!posts || posts.length === 0) {
            throw new ApiError(404, "No posts found");
        }


        return res.status(200).json({
            statusCode: 200,
            data: posts,
            message: "Posts retrieved successfully",
            success: true,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            data: [],
            message: error.message || "An error occurred",
            success: false,
        });
    }
});


const deletePost = asyncHandler(async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate postId
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            throw new ApiError(400, "Invalid Post ID.");
        }

        // Check if the post exists
        const post = await Post.findById(postId);
        if (!post) {
            throw new ApiError(404, "Post not found.");
        }

        // Check if the post belongs to the authenticated user
        if (String(post.owner) !== String(req.user.id)) {
            throw new ApiError(403, "You are not authorized to delete this post.");
        }

        // Delete all images from Cloudinary
        if (post.publicIds && post.publicIds.length > 0) {
            const failedDeletes = [];
            for (const publicId of post.publicIds) {
                const result = await deleteFromCloudinary(publicId);
                if (!result.success) {
                    failedDeletes.push(publicId); // Track any failed deletions
                }
            }

            if (failedDeletes.length > 0) {
                throw new ApiError(500, `Failed to delete some files: ${failedDeletes.join(", ")}`);
            }
        }

        // Delete the post from the database
        await Post.deleteOne({ _id: postId });

        return res.status(200).json(
            new ApiResponse(200, {}, "Post and associated images deleted successfully.")
        );
    } catch (error) {
        console.error("Error in deletePost:", error);
        return res.status(500).json(
            new ApiResponse(500, {}, "Error in deletePost.")
        );
    }
});


export {
    createPost,
    getAllPosts,
    deletePost
}