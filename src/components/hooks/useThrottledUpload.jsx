
import { useState } from 'react';
import { UploadFile, UploadPrivateFile } from '@/integrations/Core';
import { toast } from "sonner";

// Retry utility with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.response?.status === 429 || error.message?.includes('too_many_connections');
            const isServerError = error.response?.status >= 500;
            
            if ((isRateLimit || isServerError) && i < maxRetries - 1) {
                const backoff = Math.pow(2, i) * initialDelay;
                const jitter = backoff * 0.2 * Math.random(); // Add jitter to prevent thundering herd
                const delayTime = backoff + jitter;
                
                console.log(`⏳ Upload failed (attempt ${i + 1}), retrying in ${Math.round(delayTime)}ms...`);
                toast.info(`Upload failed, retrying in ${Math.round(delayTime / 1000)} seconds...`);
                
                await new Promise(resolve => setTimeout(resolve, delayTime));
                continue;
            }
            throw error;
        }
    }
};

export const useThrottledUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadQueue] = useState(new Map()); // Track ongoing uploads

    // Helper function to create descriptive filename with specific entity name
    const createDescriptiveFilename = (originalFile, entityName = 'document') => {
        const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        
        // Clean the entity name - keep alphanumeric and spaces, replace special chars with spaces
        const cleanEntityName = entityName
            .replace(/[^\w\s]/g, ' ')     // Replace non-word chars (except spaces) with spaces
            .replace(/\s+/g, '_')         // Replace spaces with underscores for file compatibility
            .trim()                       // Remove leading/trailing spaces
            .slice(0, 50);                // Limit length

        // Get extension and clean base name
        const extension = originalFile.name.split('.').pop();
        const baseName = originalFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const cleanBaseName = baseName
            .replace(/[^\w\s]/g, ' ')     // Replace non-word chars (except spaces) with spaces
            .replace(/\s+/g, '_')         // Replace spaces with underscores
            .trim();                      // Remove leading/trailing spaces
        
        // Build the final filename with underscores (file-system friendly)
        const parts = [cleanEntityName, timestamp, cleanBaseName].filter(part => part && part.trim());
        const finalName = parts.join('_') + '.' + extension;
        
        console.log(`🏷️ Creating filename: "${finalName}" from parts:`, { cleanEntityName, timestamp, cleanBaseName, extension });
        
        return finalName;
    };

    const uploadPublicFile = async (file, onSuccess, onError, entityName = 'general') => {
        const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
        
        // Prevent duplicate uploads
        if (uploadQueue.has(fileKey)) {
            toast.warning("This file is already being uploaded...");
            return;
        }

        if (isUploading) {
            toast.warning("Please wait for the current upload to finish...");
            return;
        }

        setIsUploading(true);
        uploadQueue.set(fileKey, true);

        try {
            console.log('📤 Uploading public file with retry logic...');
            
            // Create a new File object with descriptive name
            const descriptiveFilename = createDescriptiveFilename(file, entityName);
            console.log(`🎯 Final filename will be: "${descriptiveFilename}"`);
            const renamedFile = new File([file], descriptiveFilename, { type: file.type });
            
            const result = await retryWithBackoff(async () => {
                return await UploadFile({ file: renamedFile });
            });

            if (!result.file_url) {
                throw new Error('No file URL received from server.');
            }

            console.log('✅ Public file uploaded successfully:', result.file_url);
            toast.success("File uploaded successfully!");
            
            if (onSuccess) {
                await onSuccess(result.file_url, descriptiveFilename);
            }

        } catch (error) {
            console.error('❌ Public file upload failed:', error);
            
            let errorMessage = "Upload failed. Please try again.";
            if (error.response?.status === 429 || error.message?.includes('too_many_connections')) {
                errorMessage = "Server is busy. Please try again in a few moments.";
            } else if (error.response?.status >= 500) {
                errorMessage = "Server error. Please try again later.";
            }
            
            toast.error(errorMessage);
            
            if (onError) {
                onError(error);
            }
        } finally {
            setIsUploading(false);
            uploadQueue.delete(fileKey);
        }
    };

    const uploadPrivateFile = async (file, onSuccess, onError, entityName = 'general') => {
        const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
        
        if (uploadQueue.has(fileKey)) {
            toast.warning("This file is already being uploaded...");
            return;
        }

        if (isUploading) {
            toast.warning("Please wait for the current upload to finish...");
            return;
        }

        setIsUploading(true);
        uploadQueue.set(fileKey, true);

        try {
            console.log('📤 Uploading private file with retry logic...');
            
            // Create a new File object with descriptive name
            const descriptiveFilename = createDescriptiveFilename(file, entityName);
            console.log(`🎯 Final filename will be: "${descriptiveFilename}"`);
            const renamedFile = new File([file], descriptiveFilename, { type: file.type });
            
            const result = await retryWithBackoff(async () => {
                return await UploadPrivateFile({ file: renamedFile });
            });

            if (!result.file_uri) {
                throw new Error('No file URI received from server.');
            }

            console.log('✅ Private file uploaded successfully:', result.file_uri);
            toast.success("Document uploaded successfully!");
            
            if (onSuccess) {
                await onSuccess(result.file_uri, descriptiveFilename);
            }

        } catch (error) {
            console.error('❌ Private file upload failed:', error);
            
            let errorMessage = "Upload failed. Please try again.";
            if (error.response?.status === 429 || error.message?.includes('too_many_connections')) {
                errorMessage = "Server is busy. Please try again in a few moments.";
            } else if (error.response?.status >= 500) {
                errorMessage = "Server error. Please try again later.";
            }
            
            toast.error(errorMessage);
            
            if (onError) {
                onError(error);
            }
        } finally {
            setIsUploading(false);
            uploadQueue.delete(fileKey);
        }
    };

    return {
        isUploading,
        uploadPublicFile,
        uploadPrivateFile
    };
};
