export type FlipbookTexture = Array<FlipbookTexture.Texture>

export namespace FlipbookTexture {
    export interface Texture {
        flipbook_texture: string,
        atlas_tile: string,
        frames?: number[],
        ticks_per_frame?: number,
        replicate?: number,
        atlas_index?: number,
        atlas_tile_variant?: number,
        blend_frames?: boolean,
    }
}

interface Atlas {
    resource_pack_name: string,
    texture_name: string,
    texture_data: {
        [identifier: string]: {
            textures: string | string[]
        }
    }
}

export interface ItemAtlas extends Atlas {
    texture_name: 'atlas.items'
}

export interface TerrainAtlas extends Atlas {
    texture_name: 'atlas.terrain',
    num_mip_levels?: number,
    padding?: number
}