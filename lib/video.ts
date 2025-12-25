export interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    size: number;
    format: string;
}

export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                size: file.size,
                format: file.type,
            });
        };
        video.onerror = (e) => {
            window.URL.revokeObjectURL(video.src);
            reject(e);
        };
        video.src = URL.createObjectURL(file);
    });
}

export async function generateThumbnail(
    file: File,
    timestamp: number = 1
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;

        video.onloadeddata = () => {
            video.currentTime = timestamp;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                (blob) => {
                    window.URL.revokeObjectURL(video.src);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Thumbnail generation failed'));
                    }
                },
                'image/jpeg',
                0.7
            );
        };

        video.onerror = (e) => {
            window.URL.revokeObjectURL(video.src);
            reject(e);
        };
    });
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
