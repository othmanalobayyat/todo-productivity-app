import NetInfo from '@react-native-community/netinfo';

// Returns true when the device has no network connection.
// Falls back to false (assume online) if the check itself throws, so we never
// block a user action due to a NetInfo failure.
export async function checkIsOffline() {
  try {
    const state = await NetInfo.fetch();
    return !state.isConnected;
  } catch {
    return false;
  }
}
