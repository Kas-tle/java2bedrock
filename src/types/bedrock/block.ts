import { Vec3f } from "../util";

export type Blocks = Blocks.FormatVersion & Blocks.Blocks;

export namespace Blocks {
    export interface Blocks {
        [key: string]: {
            sound?: string,
            textures: string | Blocks.TextureFace,
            carried_textures?: string | Blocks.TextureFace,
            isotropic?: boolean
        }
    }
    export interface TextureFace {
        down?: string,
        east?: string,
        north?: string,
        south?: string,
        up?: string,
        west?: string
    }
    export interface FormatVersion {
        format_version: Vec3f;
    }
}