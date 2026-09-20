let currentUserId: string | null = null

export const setCloudUserId = (userId: string | null) => { currentUserId = userId }
export const getCloudUserId = () => currentUserId
