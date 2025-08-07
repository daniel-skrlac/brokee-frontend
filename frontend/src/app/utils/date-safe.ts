export function safeDate(src: unknown): Date | null {
    const d = src instanceof Date ? src : new Date(src as any);
    return isNaN(+d) ? null : d;
}
