import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, '../config/credentials.json');
const FOLDER_ID = '1PX9nsDwgrRlqi-drrHwo0F6sZRHtUKi8'; // User provided Folder ID

let driveService = null;

try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
        });
        driveService = google.drive({ version: 'v3', auth });
        console.log('Google Drive Service Initialized Successfully');
    } else {
        console.warn('Google Drive credentials.json not found at', CREDENTIALS_PATH);
    }
} catch (error) {
    console.error('Error initializing Google Drive:', error);
}

/**
 * Upload a file to Google Drive
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Name to save as in Drive
 * @param {string} mimeType - Mime type of the file
 * @returns {Promise<{ id: string, webViewLink: string, webContentLink: string }>}
 */
export const uploadToDrive = async (filePath, fileName, mimeType) => {
    if (!driveService) throw new Error('Google Drive service is not initialized');

    try {
        const fileMetadata = {
            name: fileName,
            parents: [FOLDER_ID]
        };

        const media = {
            mimeType: mimeType,
            body: fs.createReadStream(filePath)
        };

        const response = await driveService.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink'
        });

        // Set permissions to anyone with the link can view
        await driveService.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
};

/**
 * Delete a file from Google Drive
 * @param {string} fileId - Google Drive File ID
 */
export const deleteFromDrive = async (fileId) => {
    if (!driveService) return;
    try {
        await driveService.files.delete({
            fileId: fileId
        });
    } catch (error) {
        console.error('Error deleting from Google Drive:', error);
    }
};
