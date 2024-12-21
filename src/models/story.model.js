import mongoose, { Schema } from "mongoose";

const storySchema = new Schema(
    {
        storyOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        },
        postFile: [
        {
            type: String, // Cloudinary URL
            required: true,
        },
        ],
        postFilePublicId: [
        {
            type: String, // Cloudinary public_id (for image deletion)
            required: true,
        },
        ],
        description: {
        type: String, // Optional text description for the story
        default: "",
        },
        createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400, // Automatically delete after 24 hours (in seconds)
        },
        visibility: {
        type: String,
        enum: ["public", "friends", "private"],
        default: "friends",
        },
        viewers: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            viewedAt: { type: Date, default: Date.now },
        },
        ],
    },
    { timestamps: true }
);

export const Story = mongoose.model("Story", storySchema);
