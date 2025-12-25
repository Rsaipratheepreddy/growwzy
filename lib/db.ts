import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Course {
    id: string;
    name: string;
    thumbnail_blob?: Blob;
    total_videos: number;
    completed_videos: number;
    total_duration: number; // in seconds
    created_at: number;
    updated_at: number;
    storage_type: 'blob' | 'local';
    directory_handle?: FileSystemDirectoryHandle;
    last_accessed: number;
}

export interface Section {
    id: string;
    course_id: string;
    name: string;
    order: number;
    created_at: number;
}

export interface Video {
    id: string;
    course_id: string;
    section_id: string;
    title: string;
    duration: number; // in seconds
    video_blob?: Blob; // Optional for 'local' storage
    thumbnail_blob?: Blob;
    file_path?: string; // Path relative to course directory for 'local' storage
    file_size: number;
    format: string;
    order: number;
    created_at: number;
}

export interface Progress {
    id: string; // video_id
    course_id: string;
    watch_time: number;
    completed: boolean;
    last_watched: number;
    created_at: number;
    updated_at: number;
}

export interface Note {
    id: string;
    course_id: string;
    video_id: string;
    content: string;
    timestamp: number; // in seconds
    screenshot?: Blob;
    created_at: number;
    updated_at: number;
}

export interface Task {
    id: string;
    title: string;
    status: 'pending' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    course_id?: string;
    video_id?: string;
    created_at: number;
    updated_at: number;
}

export interface UserSettings {
    id: string; // 'current'
    auto_play: boolean;
    auto_next: boolean;
    default_speed: number;
    theme: 'dark' | 'light';
}

interface CourseFlowDB extends DBSchema {
    courses: {
        key: string;
        value: Course;
        indexes: { 'by-date': number; 'by-access': number };
    };
    sections: {
        key: string;
        value: Section;
        indexes: { 'by-course': string };
    };
    videos: {
        key: string;
        value: Video;
        indexes: { 'by-section': string; 'by-course': string };
    };
    progress: {
        key: string;
        value: Progress;
        indexes: { 'by-course': string; 'by-last-watched': number };
    };
    user_settings: {
        key: string;
        value: UserSettings;
    };
    notes: {
        key: string;
        value: Note;
        indexes: { 'by-video': string; 'by-course': string };
    };
    tasks: {
        key: string;
        value: Task;
        indexes: { 'by-status': string; 'by-course': string };
    };
}

const DB_NAME = 'growwzy-db';
const DB_VERSION = 3; // Bumped version for tasks

export async function initDB() {
    const db = await openDB<CourseFlowDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (oldVersion < 1) {
                const courseStore = db.createObjectStore('courses', { keyPath: 'id' });
                courseStore.createIndex('by-date', 'created_at');
                courseStore.createIndex('by-access', 'last_accessed');

                const sectionStore = db.createObjectStore('sections', { keyPath: 'id' });
                sectionStore.createIndex('by-course', 'course_id');

                const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
                videoStore.createIndex('by-section', 'section_id');
                videoStore.createIndex('by-course', 'course_id');

                const progressStore = db.createObjectStore('progress', { keyPath: 'id' });
                progressStore.createIndex('by-course', 'course_id');
                progressStore.createIndex('by-last-watched', 'last_watched');

                db.createObjectStore('user_settings', { keyPath: 'id' });
            }

            if (oldVersion < 2) {
                if (!db.objectStoreNames.contains('notes')) {
                    const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
                    noteStore.createIndex('by-video', 'video_id');
                    noteStore.createIndex('by-course', 'course_id');
                }
            }

            if (oldVersion < 3) {
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('by-status', 'status');
                    taskStore.createIndex('by-course', 'course_id');
                }
            }
        },
    });
    return db;
}

// Database helper class
export class GrowwzyRepository {
    private dbPromise: Promise<IDBPDatabase<CourseFlowDB>>;

    constructor() {
        this.dbPromise = initDB();
    }

    // --- Course Operations ---
    async addCourse(course: Course) {
        const db = await this.dbPromise;
        await db.put('courses', course);
    }

    async getCourses() {
        const db = await this.dbPromise;
        return db.getAllFromIndex('courses', 'by-access');
    }

    async getCourse(id: string) {
        const db = await this.dbPromise;
        return db.get('courses', id);
    }

    async updateCourseProgress(courseId: string, completedVideos: number) {
        const db = await this.dbPromise;
        const course = await db.get('courses', courseId);
        if (course) {
            course.completed_videos = completedVideos;
            course.last_accessed = Date.now();
            await db.put('courses', course);
        }
    }

    async deleteCourse(id: string) {
        const db = await this.dbPromise;
        const tx = db.transaction(['courses', 'sections', 'videos', 'progress', 'notes', 'tasks'], 'readwrite');

        // Delete videos
        const videoKeys = await tx.objectStore('videos').index('by-course').getAllKeys(id);
        for (const videoId of videoKeys) {
            await tx.objectStore('videos').delete(videoId);
            await tx.objectStore('progress').delete(videoId);
            const noteKeys = await tx.objectStore('notes').index('by-video').getAllKeys(videoId);
            for (const noteId of noteKeys) await tx.objectStore('notes').delete(noteId);
        }

        // Delete sections
        const sectionKeys = await tx.objectStore('sections').index('by-course').getAllKeys(id);
        for (const sectionId of sectionKeys) {
            await tx.objectStore('sections').delete(sectionId);
        }

        // Delete tasks
        const taskKeys = await tx.objectStore('tasks').index('by-course').getAllKeys(id);
        for (const taskId of taskKeys) await tx.objectStore('tasks').delete(taskId);

        // Delete course
        await tx.objectStore('courses').delete(id);
        await tx.done;
    }

    // --- Section Operations ---
    async addSection(section: Section) {
        const db = await this.dbPromise;
        await db.put('sections', section);
    }

    async getSectionsForCourse(courseId: string) {
        const db = await this.dbPromise;
        return db.getAllFromIndex('sections', 'by-course', courseId);
    }

    // --- Video Operations ---
    async addVideo(video: Video) {
        const db = await this.dbPromise;
        await db.put('videos', video);
    }

    async getVideosForSection(sectionId: string) {
        const db = await this.dbPromise;
        return db.getAllFromIndex('videos', 'by-section', sectionId);
    }

    async getVideo(id: string) {
        const db = await this.dbPromise;
        return db.get('videos', id);
    }

    async getVideosForCourse(courseId: string) {
        const db = await this.dbPromise;
        return db.getAllFromIndex('videos', 'by-course', courseId);
    }

    // --- Progress Operations ---
    async updateProgress(progress: Progress) {
        const db = await this.dbPromise;
        progress.updated_at = Date.now();
        await db.put('progress', progress);

        // Update last accessed in course
        const course = await db.get('courses', progress.course_id);
        if (course) {
            course.last_accessed = Date.now();
            await db.put('courses', course);
        }
    }

    async getProgress(videoId: string) {
        const db = await this.dbPromise;
        return db.get('progress', videoId);
    }

    async getRecentProgress(limit = 10) {
        const db = await this.dbPromise;
        const progressItems = await db.getAllFromIndex('progress', 'by-last-watched');
        return progressItems.reverse().slice(0, limit);
    }

    // --- Settings ---
    async getSettings() {
        const db = await this.dbPromise;
        let settings = await db.get('user_settings', 'current');
        if (!settings) {
            settings = {
                id: 'current',
                auto_play: true,
                auto_next: true,
                default_speed: 1,
                theme: 'dark',
            };
            await db.put('user_settings', settings);
        }
        return settings;
    }

    async saveSettings(settings: UserSettings) {
        const db = await this.dbPromise;
        await db.put('user_settings', settings);
    }

    // --- Note Operations ---
    async addNote(note: Note) {
        const db = await this.dbPromise;
        await db.put('notes', note);
    }

    async getNotesForVideo(videoId: string) {
        const db = await this.dbPromise;
        return db.getAllFromIndex('notes', 'by-video', videoId);
    }

    async deleteNote(id: string) {
        const db = await this.dbPromise;
        await db.delete('notes', id);
    }

    async updateNote(id: string, content: string) {
        const db = await this.dbPromise;
        const note = await db.get('notes', id);
        if (note) {
            note.content = content;
            note.updated_at = Date.now();
            await db.put('notes', note);
        }
    }

    // --- Task Operations ---
    async addTask(task: Task) {
        const db = await this.dbPromise;
        await db.put('tasks', task);
    }

    async getTasks() {
        const db = await this.dbPromise;
        return db.getAll('tasks');
    }

    async getTasksByStatus(status: 'pending' | 'in-progress' | 'completed') {
        const db = await this.dbPromise;
        return db.getAllFromIndex('tasks', 'by-status', status);
    }

    async updateTask(task: Task) {
        const db = await this.dbPromise;
        task.updated_at = Date.now();
        await db.put('tasks', task);
    }

    async deleteTask(id: string) {
        const db = await this.dbPromise;
        await db.delete('tasks', id);
    }

    // --- Storage Monitoring ---
    async getStorageEstimate() {
        if (navigator.storage && navigator.storage.estimate) {
            return await navigator.storage.estimate();
        }
        return null;
    }
}

export const repository = new GrowwzyRepository();
