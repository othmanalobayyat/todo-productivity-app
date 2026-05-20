import { Platform } from 'react-native';
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
// Returns { url, publicId } so the caller can store the public_id for later deletion.
export async function uploadAvatarToCDN(uri) {
  const data = new FormData();
  if (Platform.OS === 'web') {
    // On web, { uri, type, name } is not a valid FormData value — fetch the blob URL instead.
    const blob = await fetch(uri).then((r) => r.blob());
    data.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
  } else {
    data.append('file', { uri, type: 'image/jpeg', name: 'avatar.jpg' });
  }
  data.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: data },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Upload failed');
  return { url: json.secure_url, publicId: json.public_id };
}
