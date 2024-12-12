import { Post } from "../models/post.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const createPost = asyncHandler(async (req, res) => {
    
    const {description} = req.body

    if(!description){
        throw new ApiError(400, "description is required")
    }

    const postLocalPath = req.file?.path;

    if (!postLocalPath) {
        throw new ApiError(400, "post file is required22");
    }

    const postfile = await uploadOnCloudinary(postLocalPath);

    if (!postfile) {
        throw new ApiError(400, "post file is required11");
    }

    const post = await Post.create({
        description,
        postFile: postfile.url
    })

    const createdPost = await Post.findById(post._id).select()

    if (!createdPost) {
        throw new ApiError(500, "Something went wrong while creating the post")
    }

    return res.status(201).json(
        new ApiResponse(200, createdPost, "Your post is posted successfully")
    )
})

const getAllPosts = asyncHandler (async (req, res) => {
    try {
        const posts = await Post.find();

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