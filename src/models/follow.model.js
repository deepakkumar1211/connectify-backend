import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema(
    {
        follower: {
            type: Schema.Types.ObjectId, // one who is subscribing
            ref: "User"
        },
        following: {
            type: Schema.Types.ObjectId, // one who is subscribed by subscriber
            ref: "User"
        }
    },
    {timestamps: true}
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)
