import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {Follower} from "../models/follower.model.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import bcrypt from "bcrypt";



const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // saving the refresh token in database
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username, email
    // create user object - create entry on DB
    // remove password and refresh token fiels from reaponse
    // check for user creation
    // return res

    const {fullName, username, email, password} = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser) {
        throw new ApiError(409,"User with email or username already exists");
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: "",
        coverImage: "",
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered succesfully")
    )

})


const loginUser = asyncHandler(async (req,res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {email, username, password} = req.body

    // if (!username && !email) {
    //     throw new Error(400, "username or email is required");
    // }


    // here is an alternative of above code baded on logic discussed in video
    if (!(username || email)) {
        throw new Error(400, "username or email is required");
    }


    const user = await User.findOne({
        $or : [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "user does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "password incorrect");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In successfully"
        )
    )

})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true 
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged Out")
    )
})



/** If login controller gives 401 response code, it means access token expired.
 * then frontend user send api request for refreshing the access token if user have refresh token in db, instead of again login with email and password
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized Access");
    }

    try {
        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id)
    
        if (!user) {
            throw new ApiError(401,"Invalid refresh token");
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used");
        }
    
        const options = {
            httpOnly: secure,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }

})



// Change current password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id) // req.user comes from auth.middleware

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid old Password"))
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    if (oldPassword === newPassword) {
        return res
        .status(400)
        .json(new ApiResponse(400, {}, "Your old and new password are same"))
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"))
})


// get current user
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched successfully"))
})



// update account details
const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email, } = req.body

    if (!fullName || !email) {
        new ApiError(400, "All fields are required")
    }

    // req.user?.id => it comes from auth.middleware
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})


// update user avatar
const updateUserAvatar = asyncHandler(async (req, res)=> {
    // Validate uploaded file
    const fileBuffer = req.file?.buffer;

    if (!fileBuffer) {
        throw new ApiError(400, "Avatar image is required");
    }

    // Fetch current user data
    const user = await User.findById(req.user?.id).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Delete existing avatar from Cloudinary if it exists
    if (user.avatar) {
        const publicId = extractPublicId(user.avatar); // Assuming extractPublicId gets the Cloudinary public ID
        try {
            await deleteFromCloudinary(publicId);
        } catch (error) {
            console.error(`Error deleting file from Cloudinary: ${JSON.stringify(error)}`);
            return res.status(500).json(
                new ApiResponse(500, null, `Failed to delete existing avatar: ${error.message}`)
            );
        }
    }

    // Upload new avatar
    const avatar = await uploadOnCloudinary(fileBuffer, req.file.mimetype);

    if (!avatar.url) {
        throw new ApiError(500, "Error while uploading on Avatar image")
    }

    // Update user with new avatar
    user.avatar = avatar.url;
    await user.save();

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated Successfully")
    )
});


// update user cover Image
const updateUserCoverImage = asyncHandler(async (req, res)=> {
    
    // Validate uploaded file
    const fileBuffer = req.file?.buffer;

    if (!fileBuffer) {
        throw new ApiError(400, "coverImage image is required");
    }

    // Fetch current user data
    const user = await User.findById(req.user?.id).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Delete existing avatar from Cloudinary if it exists
    if (user.coverImage) {
        const publicId = extractPublicId(user.coverImage); // Assuming extractPublicId gets the Cloudinary public ID
        try {
            await deleteFromCloudinary(publicId);
        } catch (error) {
            console.error(`Error deleting file from Cloudinary: ${JSON.stringify(error)}`);
            return res.status(500).json(
                new ApiResponse(500, null, `Failed to delete existing coverImage`)
            );
        }
    }

    const coverImage = await uploadOnCloudinary(fileBuffer, req.file.mimetype);

    if (!coverImage.url) {
        throw new ApiError(500, "Error while uploading on cover image")
    }

    // Update user with new cover Image
    user.coverImage = coverImage.url;
    await user.save();

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover Image updated Successfully")
    )
});

// Helper function to extract public ID from Cloudinary URL
function extractPublicId(cloudinaryUrl) {
    const urlParts = cloudinaryUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    return fileName.split(".")[0]; // Remove file extension
}


const getProfileDetails = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        // Convert IDs to ObjectId
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const profileDetails = await User.aggregate([
            { $match: { _id: userObjectId } },
            {
                $lookup: {
                    from: "stories",
                    localField: "_id",
                    foreignField: "owner",
                    as: "stories"
                }
            },
            {
                $lookup: {
                    from: "posts",
                    localField: "_id",
                    foreignField: "owner",
                    as: "posts"
                }
            },
            {
                $addFields: {
                    // Sort stories and posts by creation timestamp in descending order
                    stories: { $sortArray: { input: "$stories", sortBy: { createdAt: -1 } } },
                    posts: { $sortArray: { input: "$posts", sortBy: { createdAt: -1 } } }
                }
            },
            {
                $lookup: {
                    from: "followers",
                    let: { userId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$following", "$$userId"] } } },
                        { $count: "followerCount" }
                    ],
                    as: "followerStats"
                }
            },
            {
                $lookup: {
                    from: "followers",
                    let: { userId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$follower", "$$userId"] } } },
                        { $count: "followingCount" }
                    ],
                    as: "followingStats"
                }
            },
            {
                $lookup: {
                    from: "followers",
                    let: { userId: "$_id", currentUserId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$follower", new mongoose.Types.ObjectId(currentUserId)] },
                                        { $eq: ["$following", "$$userId"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "isFollowingStats"
                }
            },
            {
                $lookup: {
                    from: "followers",
                    let: { userId: "$_id", currentUserId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$follower", "$$userId"] },
                                        { $eq: ["$following", new mongoose.Types.ObjectId(currentUserId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "isFollowedByStats"
                }
            },
            {
                $addFields: {
                    followerCount: { $ifNull: [{ $arrayElemAt: ["$followerStats.followerCount", 0] }, 0] },
                    followingCount: { $ifNull: [{ $arrayElemAt: ["$followingStats.followingCount", 0] }, 0] },
                    isFollowing: { $gt: [{ $size: "$isFollowingStats" }, 0] },
                    isFollowedBy: { $gt: [{ $size: "$isFollowedByStats" }, 0] },
                    postCount: { $size: "$posts" }
                }
            },
            {
                $project: {
                    password: 0,
                    refreshToken: 0,
                    __v: 0,
                    "stories.__v": 0,
                    "posts.__v": 0,
                    followerStats: 0,
                    followingStats: 0,
                    isFollowingStats: 0,
                    isFollowedByStats: 0
                }
            }
        ]);

        if (!profileDetails || profileDetails.length === 0) {
            throw new ApiError(404, "User not found");
        }

        return res.status(200).json(
            new ApiResponse(200, profileDetails[0], "Profile details retrieved successfully.")
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(
            new ApiResponse(500, {}, "Error in getting the profile details.")
        );
    }
});




const followUnfollowUser = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params; // ID of the user to follow/unfollow
        const currentUserId = req.user.id; // ID of the logged-in user from middleware

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json(
                new ApiResponse(400, null, "Invalid user ID.")
            );
        }

        if (userId === currentUserId) {
            return res.status(400).json(
                new ApiResponse(400, null, "You cannot follow or unfollow yourself.")
            );
        }

        // Check if the subscription already exists
        const existingSubscription = await Follower.findOne({
            follower: currentUserId,
            following: userId,
        });

        if (existingSubscription) {
            // Unfollow the user
            await Follower.deleteOne({ _id: existingSubscription._id });

            return res.status(200).json(
                new ApiResponse(200, null, "User unfollowed successfully.")
            );
        }

        // Follow the user
        await Follower.create({
            follower: currentUserId,
            following: userId,
        });

        return res.status(200).json(
            new ApiResponse(200, null, "User followed successfully.")
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(
            new ApiResponse(500, null, "An error occurred while processing your request.")
        );
    }
});


const searchUsers = asyncHandler(async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            throw new ApiError(400, "Keyword parameter is required");
        }

        const users = await User.find(
            {
                $or: [
                    { username: { $regex: keyword, $options: "i" } },
                    { fullName: { $regex: keyword, $options: "i" } },
                ],
            },
            { password: 0, refreshToken: 0, __v: 0 }
        )
        .limit(20);

        if (users.length === 0) {
            return res.status(404).json(
                new ApiResponse(404, [], "No users found matching the keyword.")
            );
        }

        return res.status(200).json(
            new ApiResponse(200, users, "Users retrieved successfully.")
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(
            new ApiResponse(500, {}, "Error occurred while searching for users.")
        );
    }
});


// Update user profile 
const updateUserProfile = asyncHandler(async (req, res) => {
    const { username, fullName, avatar, coverImage, password, bio } = req.body;
    const userId = req.user.id; // Get user ID from JWT

    // Fetch current user
    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) {
        return res.status(404).json(new ApiResponse(404, {}, "User not found"));
    }

    // Check for username update
    if (username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json(new ApiResponse(409, {}, "Username already exists"));
        }
        user.username = username.toLowerCase();
    }

    // Handle avatar and coverImage file uploads
    if (req.files?.avatar) {
        const fileBuffer = req.files.avatar[0].buffer;
        if (user.avatar) {
            const publicId = extractPublicId(user.avatar);
            await deleteFromCloudinary(publicId);
        }
        const avatarUpload = await uploadOnCloudinary(fileBuffer, req.files.avatar[0].mimetype);
        if (!avatarUpload.url) {
            return res.status(500).json(new ApiResponse(500, null, "Error uploading avatar image"));
        }
        user.avatar = avatarUpload.url;
    }

    if (req.files?.coverImage) {
        const fileBuffer = req.files.coverImage[0].buffer;
        if (user.coverImage) {
            const publicId = extractPublicId(user.coverImage);
            await deleteFromCloudinary(publicId);
        }
        const coverImageUpload = await uploadOnCloudinary(fileBuffer, req.files.coverImage[0].mimetype);
        if (!coverImageUpload.url) {
            return res.status(500).json(new ApiResponse(500, null, "Error uploading cover image"));
        }
        user.coverImage = coverImageUpload.url;
    }

    // Update other profile fields
    if (fullName) user.fullName = fullName;
    if (bio) user.bio = bio;

    // Hash password before saving
    if (password) {
        const saltRounds = 10;
        user.password = await bcrypt.hash(password, saltRounds);
    }

    // Save the updated user
    await user.save();

    return res.status(200).json(new ApiResponse(200, user, "Profile updated successfully"));
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getProfileDetails,
    followUnfollowUser,
    searchUsers,
    updateUserProfile
}