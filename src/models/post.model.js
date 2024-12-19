import mongoose, {Schema} from "mongoose";


const postSchema = new Schema(
    {
        postFile: [
            {
                type: String, // cloudinary url
                required: true
            }
        ],
        description: {
            type: String,
            required: true
        },
        likes: {
            type: Number,
            default: 0
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {timestamps: true
    }
)


export const Post = mongoose.model("Post", postSchema)
