import { Router } from "express";
import {getAllPosts, createPost} from "../controllers/post.controller.js"

import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/create-post").post(verifyJWT,
    upload.single("postMedia"), // please give this name (postMedia) during sending request on Postman postMedia: filename.jpg
    createPost
)


router.route("/get-all-posts").get(getAllPosts)

export default router
