import { Matrix, Vec, Vec3f } from "../types/util";

export function tenKRound(value: number) {
    return Math.round(value * 10000) / 10000;
}

export namespace scale {
    export function point(point: Vec3f, pivot: Vec3f, scale: number): Vec3f {
        // Translate to the pivot
        const translated: Vec3f = [
            point[0] - pivot[0],
            point[1] - pivot[1],
            point[2] - pivot[2]
        ];
    
        // Scale
        const scaled: Vec3f = [
            translated[0] * scale,
            translated[1] * scale,
            translated[2] * scale
        ];
    
        // Translate back
        const finalPosition: Vec3f = [
            tenKRound(scaled[0] + pivot[0]),
            tenKRound(scaled[1] + pivot[1]),
            tenKRound(scaled[2] + pivot[2])
        ];
    
        return finalPosition;
    }
    
    export function size(size: Vec3f, scale: number): Vec3f {
        const scaled: Vec3f = [
            tenKRound(size[0] * scale),
            tenKRound(size[1] * scale),
            tenKRound(size[2] * scale)
        ];
    
        return scaled;
    }
}

export function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

export namespace matrix {
    export function mul(a: Matrix, b: Matrix): Matrix {
        let result: Matrix = Array(a.length).fill(0).map(() => Array(b[0].length).fill(0));
    
        for(let i = 0; i < a.length; i++) {
            for(let j = 0; j < b[0].length; j++) {
                for(let k = 0; k < a[0].length; k++) {
                    result[i][j] += a[i][k] * b[k][j];
                }
            }
        }
    
        return result;
    }

    export function mulVec<T extends Vec>(m: Matrix, v: T): T {
        let result: Vec = Array(m.length).fill(0);
    
        for(let i = 0; i < m.length; i++) {
            for(let j = 0; j < m[0].length; j++) {
                result[i] += m[i][j] * v[j];
            }
        }
    
        return result as T;
    }
}

export namespace vector {
    export function mul<T extends Vec>(a: T, b: T | undefined): T {
        if(b == null) {
            return a;
        }
        return a.map((val, index) => val * b[index]) as T;
    }

    export function add<T extends Vec>(a: T, b: T | undefined): T {
        if(b == null) {
            return a;
        }
        return a.map((val, index) => val + b[index]) as T;
    }
    
    export function sub<T extends Vec>(a: T, b: T | undefined): T {
        if(b == null) {
            return a;
        }
        return a.map((val, index) => val - b[index]) as T;
    }
}

export namespace rotation {
    export function z(theta: number): Matrix {
        return [
            [Math.cos(theta), Math.sin(theta), 0],  // Notice the sine is positive here
            [- Math.sin(theta), Math.cos(theta), 0], // and negative here
            [0,               0,                1]
        ];
    }
    
    export function y(theta: number): Matrix {
        return [
            [Math.cos(theta),  0, Math.sin(theta)],
            [0,               1, 0              ],
            [- Math.sin(theta), 0, Math.cos(theta)]
        ];
    }
    
    export function x(theta: number): Matrix {
        return [
            [1, 0,               0              ],
            [0, Math.cos(theta), Math.sin(theta)],
            [0, - Math.sin(theta),  Math.cos(theta)]
        ];
    }
}

export namespace euler {
    export namespace zyx {
        export function rotatePoint(point: Vec3f, pivot: Vec3f | undefined, rotationDegrees: Vec3f | undefined): Vec3f {
            if(rotationDegrees == null) {
                return point;
            }
            const r = {
                x: degreesToRadians(rotationDegrees[0]),
                y: degreesToRadians(rotationDegrees[1]),
                z: degreesToRadians(rotationDegrees[2])
            };
        
            const translated = vector.sub(point, pivot);
            const rotationMatrix = matrix.mul(rotation.z(r.z), matrix.mul(rotation.y(r.y), rotation.x(r.x)));
            const rotatedPoint = matrix.mulVec(rotationMatrix, translated);
            const finalPosition = vector.add(rotatedPoint, pivot);
        
            // Translate back to pivot
            return finalPosition as Vec3f;
        }
    }

    export namespace xyz {
        export function rotatePoint(point: Vec3f, pivot: Vec3f, rotationDegrees: Vec3f): Vec3f {
            const r = {
                x: degreesToRadians(rotationDegrees[0]),
                y: degreesToRadians(rotationDegrees[1]),
                z: degreesToRadians(rotationDegrees[2])
            };
        
            const translated = vector.sub(point, pivot);
            const rotationMatrix = matrix.mul(rotation.x(r.x), matrix.mul(rotation.y(r.y), rotation.z(r.z)));
            const rotatedPoint = matrix.mulVec(rotationMatrix, translated);
            const finalPosition = vector.add(rotatedPoint, pivot);
        
            // Translate back to pivot
            return finalPosition as Vec3f;
        }
    }
}

// console.log(euler.zyx.rotatePoint(vector.add([3.9647, 10, -7.9459], [4, 4, 12]), [5.9647, 12, 2.0541], [45, 0, 0]));