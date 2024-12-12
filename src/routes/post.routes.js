import { Router } from "express";
import {getAllPosts, createPost} from "../controllers/post.controller.js"

import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/create-post").post(verifyJWT,
    upload.single("post"),
    createPost
)


router.route("/get-all-posts").get(getAllPosts)

export default router
