export const profilePictureStorageKey = (userId) => `smartcampus:profile-picture:${userId}`;

export const readProfilePicture = (userId) => {
    if (userId == null) return "";
    return localStorage.getItem(profilePictureStorageKey(userId)) || "";
};
