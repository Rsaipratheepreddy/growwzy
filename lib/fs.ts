/**
 * Utilities for interacting with the File System Access API.
 */

export async function verifyPermission(handle: any, readWrite: boolean = false) {
    const options: any = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }

    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }

    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }

    return false;
}

/**
 * Recursively find a file in a directory handle by its path segments.
 */
export async function getFileHandle(
    directoryHandle: FileSystemDirectoryHandle,
    pathSegments: string[]
): Promise<FileSystemFileHandle | null> {
    try {
        let currentHandle: FileSystemDirectoryHandle = directoryHandle;

        // Navigate through subdirectories
        for (let i = 0; i < pathSegments.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(pathSegments[i]);
        }

        // Get the file handle
        const fileName = pathSegments[pathSegments.length - 1];
        return await currentHandle.getFileHandle(fileName);
    } catch (error) {
        console.error('Error resolving file handle:', error);
        return null;
    }
}

/**
 * Walk through a directory and find all video files.
 */
export async function walkDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    path: string[] = []
): Promise<{ file: File; relativePath: string[] }[]> {
    const videos: { file: File; relativePath: string[] }[] = [];
    const videoExtensions = ['.mp4', '.mkv', '.webm', '.mov', '.avi'];

    // @ts-ignore
    for await (const entry of (directoryHandle as any).values()) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            const isVideo = videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
            const isMeta = file.name.startsWith('._');

            if (isVideo && !isMeta) {
                videos.push({ file, relativePath: [...path, file.name] });
            }
        } else if (entry.kind === 'directory') {
            const subVideos = await walkDirectory(entry, [...path, entry.name]);
            videos.push(...subVideos);
        }
    }

    return videos;
}
