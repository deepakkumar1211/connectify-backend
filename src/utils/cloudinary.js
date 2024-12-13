// import { v2 as cloudinary } from 'cloudinary';
// import fs from "fs"


// cloudinary.config({ 
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//     api_key: process.env.CLOUDINARY_API_KEY, 
//     api_secret: process.env.CLOUDINARY_API_SECRET 
// });


// const uploadOnCloudinary = async (localFilePath) => {
//     try {
//         if(!localFilePath) return null

//         // upload the file on cloudinary
//         const response = await cloudinary.uploader.upload(localFilePath, {
//             resource_type: "auto"
//         })
//         //file has been uploaded successfully
//         // console.log("file is uploaded on cloudinary", response.url);
//         fs.unlinkSync(localFilePath)
//         return response
//     } catch (error) {
//         fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
//         return null;
//     }
// }

// export {uploadOnCloudinary}



// code for multer.memoryStorage 
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure Cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Upload a file to Cloudinary using a Buffer
const uploadOnCloudinary = async (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto", // Automatically determine the file type
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        // Convert Buffer to a readable stream and pipe to Cloudinary
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

export { uploadOnCloudinary };
