import api from './api';

const authHeaders = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

/**
 * Upload a single image file to ImageKit CDN through the decoupled upload pipeline.
 * @param {File} file - Image File object
 * @param {string} token - Clerk auth token
 * @returns {Promise<string>} Uploaded ImageKit URL
 */
export const uploadSingleImage = async (file, token) => {
  if (typeof file === 'string' && file.startsWith('http')) {
    return file;
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/upload/image', formData, {
    ...authHeaders(token),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.data?.url) {
    throw new Error('ImageKit upload did not return an image URL');
  }

  return response.data.url;
};

/**
 * Upload an array of mixed images (File objects + existing URL strings)
 * and resolve them into a clean array of hosted URLs.
 * @param {Array<File|string>} images - Array of files or strings
 * @param {string} token - Clerk auth token
 * @param {function} [onProgress] - Optional callback(current, total)
 * @returns {Promise<string[]>} Array of image URLs
 */
export const uploadAllListingImages = async (images, token, onProgress) => {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [];
  }

  const results = [];
  const total = images.length;

  for (let i = 0; i < total; i++) {
    const item = images[i];
    if (typeof item === 'string' && item.startsWith('http')) {
      results.push(item);
    } else if (item instanceof File) {
      if (onProgress) onProgress(i + 1, total);
      const url = await uploadSingleImage(item, token);
      results.push(url);
    }
  }

  return results;
};

export default {
  uploadSingleImage,
  uploadAllListingImages,
};
