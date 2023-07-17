export function getIntersection(arr1: string[], arr2: string[]): string[] {
    const set2 = new Set(arr2);
    return arr1.filter(item => set2.has(item));
}