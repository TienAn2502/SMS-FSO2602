import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: ReturnType<typeof FingerprintJS.load> | null = null;

export function getFingerprint() {
    if (!fpPromise) {
        fpPromise = FingerprintJS.load();
    }

    return fpPromise;
}

class FingerprintService {
    private deviceId: string | null = null;
    private initialized = false;

    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            const fp = await getFingerprint();
            const result = await fp.get();
            this.deviceId = result.visitorId;
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize fingerprint:', error);
            // Generate a fallback device ID
            this.deviceId = this.generateFallbackDeviceId();
            this.initialized = true;
        }
    }

    private generateFallbackDeviceId(): string {
        const stored = localStorage.getItem('device_id');
        if (stored) {
            return stored;
        }
        const newId = crypto.randomUUID();
        localStorage.setItem('device_id', newId);
        return newId;
    }

    getDeviceId(): string {
        if (!this.initialized) {
            // Synchronous fallback
            return this.getOrCreateDeviceIdSync();
        }
        return this.deviceId ?? this.getOrCreateDeviceIdSync();
    }

    private getOrCreateDeviceIdSync(): string {
        if (this.deviceId) {
            return this.deviceId;
        }

        const stored = localStorage.getItem('device_id');
        if (stored) {
            this.deviceId = stored;
            return stored;
        }

        const newId = crypto.randomUUID();
        localStorage.setItem('device_id', newId);
        this.deviceId = newId;
        return newId;
    }
}

export const fingerprintService = new FingerprintService();

// Auto-initialize on module load
if (typeof window !== 'undefined') {
    fingerprintService.initialize();
}
