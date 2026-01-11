import { createClient, MatrixClient, ICreateRoomOpts, Visibility, Preset } from 'matrix-js-sdk';

let client: MatrixClient | null = null;

export const getMatrixClient = async (): Promise<MatrixClient | null> => {
    if (client) {
        if (!client.isLoggedIn()) {
            await client.startClient({ initialSyncLimit: 10 });
        }
        return client;
    }

    const homeserverUrl = localStorage.getItem('matrix_homeserver');
    const accessToken = localStorage.getItem('matrix_access_token');
    const userId = localStorage.getItem('matrix_user_id');

    if (!homeserverUrl || !accessToken || !userId) {
        console.warn('Matrix credentials not found in localStorage');
        return null;
    }

    client = createClient({
        baseUrl: homeserverUrl,
        accessToken: accessToken,
        userId: userId,
    });

    // Start client to sync
    await client.startClient({ initialSyncLimit: 20 });

    // Wait for sync to be ready (optional, but good for immediate data)
    // In a real app you might want to handle sync state globally

    return client;
};

export const createMatrixRoom = async (name: string, topic?: string, isPublic: boolean = false): Promise<string> => {
    const client = await getMatrixClient();
    if (!client) throw new Error('Not connected to Matrix');

    const options: ICreateRoomOpts = {
        name,
        topic,
        visibility: isPublic ? Visibility.Public : Visibility.Private,
        preset: isPublic ? Preset.PublicChat : Preset.PrivateChat,
    };

    const result = await client.createRoom(options);
    return result.room_id;
};

export const joinRoom = async (roomIdOrAlias: string): Promise<void> => {
    const client = await getMatrixClient();
    if (!client) throw new Error('Not connected to Matrix');

    await client.joinRoom(roomIdOrAlias);
}

export const getPublicRooms = async (searchTerm?: string) => {
    const client = await getMatrixClient();
    if (!client) throw new Error('Not connected to Matrix');

    const response = await client.publicRooms({
        limit: 50,
        filter: {
            generic_search_term: searchTerm
        }
    });
    return response.chunk;
};

export const inviteUser = async (roomId: string, userId: string): Promise<void> => {
    const client = await getMatrixClient();
    if (!client) throw new Error('Not connected to Matrix');

    await client.invite(roomId, userId);
}

export const logoutMatrix = () => {
    if (client) {
        client.stopClient();
        client = null;
    }
    localStorage.removeItem('matrix_access_token');
    localStorage.removeItem('matrix_user_id');
    localStorage.removeItem('matrix_homeserver');
};
