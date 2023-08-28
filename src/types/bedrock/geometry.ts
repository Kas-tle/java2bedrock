import { Vec2f, Vec3f } from "../util";

export interface Geometry {
    format_version: string,
    debug?: boolean,
    'minecraft:geometry': Geometry.Geometry[]
}

export namespace Geometry {
    export interface Geometry {
        description: Geometry.Description,
        cape?: string,
        bones?: Geometry.Bone[]
    }
    export interface Description {
        identifier: string,
        visible_bounds_width?: number,
        visible_bounds_height?: number,
        visible_bounds_offset?: Vec3f,
        texture_width?: number,
        texture_height?: number
    }
    export interface Bone {
        name: string,
        binding?: string,
        parent?: string,
        pivot?: Vec3f,
        rotation?: Vec3f,
        mirror?: boolean,
        inflate?: number,
        debug?: boolean,
        render_group_id?: number,
        cubes?: Cube[],
        molang_binding?: string,
        locators?: {
            [identifier: string]: Locator[],
        },
        poly_mesh?: PolyMesh,
        texture_meshes?: TextureMesh[]
    }
    export interface Locator {
        offset: Vec3f,
        rotation?: Vec3f,
        ignore_inherited_scale?: boolean
    }
    export interface Cube {
        origin?: Vec3f,
        size?: Vec3f,
        rotation?: Vec3f,
        pivot?: Vec3f,
        inflate?: number,
        mirror?: boolean,
        uv?: Vec2f | PerFaceUV
    }
    export interface PerFaceUV {
        north?: Face,
        south?: Face,
        east?: Face,
        west?: Face,
        up?: Face,
        down?: Face,
    }
    export interface Face {
        uv: Vec2f,
        uv_size?: Vec2f,
        material_instance?: string
    }
    export interface PolyMesh {
        normalized_uvs?: boolean,
        positions?: Vec3f[],
        normals?: Vec3f[],
        uvs?: Vec2f[],
        polys?: Poly
    }
    export type Poly = [Vec3f, Vec3f, Vec3f][] | [Vec3f, Vec3f, Vec3f, Vec3f][] | 'tri_list' | 'quad_list'
    export interface TextureMesh {
        texture: string,
        position?: Vec3f,
        local_pivot?: Vec3f,
        rotation?: Vec3f,
        scale?: Vec3f,
    }
}