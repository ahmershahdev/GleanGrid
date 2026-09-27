const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];
const MAX_INPUT = 25 * 1024 * 1024;

export class ImageError extends Error {}

async function decode(file) {
    if ('createImageBitmap' in window) {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        await img.decode();
        return img;
    } finally {
        URL.revokeObjectURL(url);
    }
}

function toBlob(canvas, quality) {
    if (canvas.convertToBlob) return canvas.convertToBlob({ type: 'image/webp', quality });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

export async function compressToWebp(file, { maxSide = 1600, quality = 0.82 } = {}) {
    if (!file) throw new ImageError('no_file');
    if (!ACCEPT.includes(file.type) && !/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name)) throw new ImageError('type');
    if (file.size > MAX_INPUT) throw new ImageError('too_big');

    let source;
    try {
        source = await decode(file);
    } catch {
        throw new ImageError('decode');
    }

    const w0 = source.width;
    const h0 = source.height;
    if (w0 < 64 || h0 < 64) throw new ImageError('too_small');

    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    const width = Math.round(w0 * scale);
    const height = Math.round(h0 * scale);

    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
    source.close?.();

    let blob = await toBlob(canvas, quality);
    let type = 'image/webp';
    if (!blob || blob.type !== 'image/webp') {
        blob = await (canvas.convertToBlob ? canvas.convertToBlob({ type: 'image/jpeg', quality }) : new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality)));
        type = 'image/jpeg';
    }

    if (file.type === 'image/webp' && scale === 1 && blob.size >= file.size) {
        return { file, before: file.size, after: file.size, width, height };
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    const out = new File([blob], `${base}.${type === 'image/webp' ? 'webp' : 'jpg'}`, { type, lastModified: Date.now() });
    return { file: out, before: file.size, after: out.size, width, height };
}

export function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
