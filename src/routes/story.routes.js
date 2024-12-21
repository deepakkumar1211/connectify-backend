import { Router } from "express";
import {postStatus} from "../controllers/story.controller.js"

import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/post-story").post(verifyJWT,
    upload.single("postMedia"), // please give this name (postMedia) during sending request on Postman postMedia: filename.jpg
    postStatus
)


// router.route("/get-all-posts").get(getAllPosts)

export default router
