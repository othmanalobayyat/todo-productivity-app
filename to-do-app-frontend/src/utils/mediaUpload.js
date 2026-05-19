import * as ImagePicker from 'expo-image-picker';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function pickImageFromLibrary() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

// Uploads to Cloudinary using an unsigned upload preset.
// Uses a deterministic public_id (avatars/user_<id>) so each upload
// overwrites the same slot — no orphan images accumulate over time.
export async function uploadAvatarToCDN(uri, userId) {
  const data = new FormData();
  data.append('file', { uri, type: 'image/jpeg', name: 'avatar.jpg' });
  data.append('upload_preset', UPLOAD_PRESET);
  data.append('public_id', `avatars/user_${userId}`);
  data.append('overwrite', 'true');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: data },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Upload failed');
  return json.secure_url;
}
