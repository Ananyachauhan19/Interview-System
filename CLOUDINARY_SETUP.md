# Cloudinary Integration for Profile Pictures

This project uses **Cloudinary** for storing profile pictures with automatic image optimization and transformation.

## Setup Instructions

1. **Create a Cloudinary Account**
   - Go to [cloudinary.com](https://cloudinary.com)
   - Sign up for a free account

2. **Get Your Credentials**
   - After signing in, go to your Dashboard
   - Copy the following credentials:
     - Cloud Name
     - API Key
     - API Secret

3. **Configure Environment Variables**
   Add these to your `backend/.env` file:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

## Folder Structure

Profile pictures are automatically organized into folders:
- **student_profile/**: Contains all student profile pictures
- **teacher_profile/**: Contains all teacher/coordinator profile pictures

## Features

- **Automatic Image Optimization**: Images are automatically optimized for web
- **Face Detection**: Profile pictures are cropped to 400x400 with face detection
- **Format Conversion**: Automatic format selection (WebP, JPEG, etc.)
- **Old Image Cleanup**: Previous avatars are automatically deleted when uploading new ones
- **Fallback to Initials**: When no profile picture is uploaded, user initials are displayed

## Image Transformations

All uploaded avatars are transformed with:
- Width: 400px
- Height: 400px
- Crop: Fill with face gravity
- Quality: Auto
- Format: Auto

## API Endpoints

- `PUT /auth/me/avatar` - Upload/update profile picture (requires authentication)
- `GET /auth/me` - Get user profile including avatarUrl

## Frontend Integration

Profile pictures are displayed in:
- Student Profile page (`/student/profile`)
- Coordinator Profile page (`/coordinator/profile`)
- Navigation bar dropdowns (with fallback to initials)
