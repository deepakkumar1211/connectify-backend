import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import {mongoose, ObjectId} from "mongoose";
import jwt from "jsonwebtoken"

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

const getAllPosts = asyncHandler(async (req, res) => {
    try {
        let userObjectId = null;

        // Check for Authorization header
        let token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
        // console.log(token);
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                const userId = decoded._id; // Extract user ID from token
                // console.log(userId);
                
                userObjectId = new mongoose.Types.ObjectId(userId);// Convert string to ObjectId
            } catch (error) {
                console.error("Invalid token:", error.message);
            }
        }
        
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
                $addFields: {
                    likesCount: {
                        $size: "$likes"
                    },
                    isLiked: {
                        $cond: {
                            if: {$in : [userObjectId, "$likes"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: { // Select necessary fields
                    _id: 1,
                    postFile: 1,
                    description: 1,
                    likes: 1,
                    owner: 1,
                    likesCount: 1,
                    isLiked: 1,
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

        return res.status(200).json(
            new ApiResponse(200, posts, "Posts retrieved successfully.")
        );
    } catch (error) {
        console.log(error);

        return res.status(500).json(
            new ApiResponse(500, {}, "Error in getting the post.")
        );
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


// Like or unlike a post
const likePost = asyncHandler(async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        if (!userId) {
            throw new ApiError(401, "User not authenticated");
        }

        // Find the post by ID
        const post = await Post.findById(postId);

        if (!post) {
            throw new ApiError(404, "Post not found");
        }

        // Check if user has already liked the post
        const alreadyLiked = post.likes.includes(userId);

        if (alreadyLiked) {
            // Unlike the post
            post.likes = post.likes.filter((like) => like.toString() !== userId);
            await post.save();

            return res.status(200).json(
                new ApiResponse(200, post, "Post unliked successfully")
            );
        } else {
            // Like the post
            post.likes.push(userId);
            await post.save();

            return res.status(200).json(
                new ApiResponse(200, post, "Post liked successfully")
            );
        }
    } catch (error) {
        console.log(error)
        return res.status(error.statusCode || 500).json(
            new ApiResponse(error.statusCode || 500, null, error?.message || "Something went wrong")
        );
    }
});



export {
    createPost,
    getAllPosts,
    deletePost,
    likePost
}