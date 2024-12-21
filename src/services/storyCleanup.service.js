import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import {Story} from "../models/story.model.js"

/*
// Configure Cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Function to delete images from Cloudinary
const deleteCloudinaryImages = async (publicIds) => {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
        console.log("No Cloudinary images to delete.");
        return;
    }
    try {
        const deletePromises = publicIds.map((publicId) =>
        cloudinary.v2.uploader.destroy(publicId)
        );
        await Promise.all(deletePromises);
        console.log("Successfully deleted Cloudinary images.");
    } catch (error) {
        console.error("Error deleting Cloudinary images:", error);
        throw new Error("Failed to delete Cloudinary images.");
    }
};

// Function to monitor story deletions
// const monitorStoryDeletions = () => {
//     const storyCollection = mongoose.connection.collection("stories");

//     // Watch for deletions in the stories collection
//     const changeStream = storyCollection.watch([
//         { $match: { operationType: "delete" } },
//     ], { fullDocumentBeforeChange: "required" }); // Ensure pre-images are retrieved

//     changeStream.on("change", async (change) => {
//         const deletedStoryId = change.documentKey._id;

//         if (!change.fullDocumentBeforeChange) {
//             console.log(`No full document found for deletion (pre-images not available).`);
//             return;
//         }

//         const deletedStory = change.fullDocumentBeforeChange;

//         try {
//             if (Array.isArray(deletedStory.postFilePublicId) && deletedStory.postFilePublicId.length > 0) {
//                 await deleteCloudinaryImages(deletedStory.postFilePublicId);
//                 console.log(`Cleaned up Cloudinary images for story ID: ${deletedStoryId}`);
//             } else {
//                 console.log(`No Cloudinary images to delete for story ID: ${deletedStoryId}`);
//             }
//         } catch (error) {
//             console.error(`Error during story deletion processing:`, error);
//         }
//     });

//     console.log("Story deletion monitoring started.");
// };


// Function to monitor story deletions
const monitorStoryDeletions = () => {
    const storyCollection = mongoose.connection.collection('stories'); // Replace 'stories' with your actual collection name
  
    // Watch for deletions in the 'stories' collection
    const changeStream = storyCollection.watch([
      { $match: { operationType: 'delete' } }
    ]);
  
    changeStream.on('change', async (change) => {
      const deletedStory = change.documentKey;
      if (deletedStory) {
        console.log(`Story with ID ${deletedStory._id} was deleted.`);
  
        try {
          const story = await mongoose.model('Story').findById(deletedStory._id);
          if (story) {
            await deleteCloudinaryImages(story.postFilePublicId);
            console.log("Image is deleted");
            
          }
        } catch (error) {
          console.error("Error during story deletion processing:", error);
        }
      }
    });
  
    console.log("Story deletion monitoring started.");
  };


export {monitorStoryDeletions}
*/


// Function to delete images from Cloudinary
const deleteCloudinaryImages = async (publicIds) => {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
        console.log("No Cloudinary images to delete. Received publicIds:", publicIds);
        return;
    }

    try {
        console.log("Initiating deletion of Cloudinary images:", publicIds);
        const deletePromises = publicIds.map((publicId) =>
            cloudinary.v2.uploader.destroy(publicId)
        );
        const results = await Promise.all(deletePromises);
        console.log("Successfully deleted Cloudinary images. Results:", results);
    } catch (error) {
        console.error("Error deleting Cloudinary images:", error);
        throw new Error("Failed to delete Cloudinary images.");
    }
};

const monitorStoryDeletions = () => {
    const storyCollection = mongoose.connection.collection('stories');

    console.log("Starting to monitor story deletions...");

    const changeStream = storyCollection.watch([{ $match: { operationType: 'delete' } }]);

    changeStream.on('change', async (change) => {
        console.log("Change event detected:", JSON.stringify(change, null, 2));
    
        const deletedStoryId = change.documentKey?._id;
    
        if (!deletedStoryId) {
            console.log("No valid document key found in the change event.");
            return;
        }
    
        console.log("Deleted Story ID Type:", typeof deletedStoryId);
        console.log(`Story with ID ${deletedStoryId} was deleted.`);
    
        try {
            const story = await mongoose.model('Story').findOne({ _id: deletedStoryId });
    
            // If the story does not exist in the database anymore (it has already been deleted)
            if (!story) {
                console.log("No matching story found in the database for the deleted ID.");
                return;
            }
    
            console.log("Story details retrieved from the database:", story);
            await deleteCloudinaryImages(story.postFilePublicId);
            console.log("Image(s) associated with the story have been deleted.");
        } catch (error) {
            console.error("Error during story deletion processing:", error);
        }
    });

    changeStream.on('error', (error) => {
        console.error("Error in change stream monitoring:", error);
    });

    console.log("Story deletion monitoring started.");
};

export { monitorStoryDeletions };
