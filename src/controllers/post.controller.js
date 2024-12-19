import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

    // Create the post
    const post = await Post.create({
        description,
        postFile: postfile.url,
        owner: ownerId || "" // Attach the owner's ID to the post
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



const getAllPosts = asyncHandler (async (req, res) => {
    try {
        // const posts = await Post.find();
        const posts = await Post.find().sort({ createdAt: -1 }); // get data in reverse order
        if (!posts || posts.length === 0) {
            throw new ApiError(404, "No posts found");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, posts, "Posts retrieved successfully"));

    } catch (error) {
        return res
            .status(error.statusCode || 500)
            .json(new ApiResponse(error.statusCode || 500, {}, error.message || "An error occurred"));
    }
})


export {
    createPost,
    getAllPosts
}