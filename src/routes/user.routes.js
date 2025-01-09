import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    updateUserAvatar,
    updateUserCoverImage,
    getProfileDetails
    } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)


router.route("/login").post(loginUser)


// secured routes
router.route("/logout").post(verifyJWT,logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/update-avatar").patch(verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)

router.route("/update-cover-image").patch(verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
)

router.route("/profile/:userId").get(verifyJWT, getProfileDetails)

export default router