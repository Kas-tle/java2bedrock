import { Range } from "../util"

export interface Fog {
    format_version: string,
    "minecraft:fog_settings": {
        description: Fog.Description,
        distance?: Fog.Distance
        volumetric?: Fog.Volumetric
    }
}

export namespace Fog {
    export interface Description {
        identifier: string
    }
    export interface Distance {
        air: DistanceFogSettings,
        water: DistanceFogSettings,
        lava: DistanceFogSettings,
        lava_resistance: DistanceFogSettings,
        powder_snow: DistanceFogSettings,
        weather: DistanceFogSettings
    }
    export interface DistanceFogSettings {
        fog_start: number,
        fog_end: number,
        fog_color: `#${string}`,
        render_distance_type: 'fixed' | 'render',
        transition_fog?: {
            init_fog: {
                fog_start: number,
                fog_end: number,
                fog_color: `#${string}`,
                render_distance_type: 'fixed' | 'render',
            },
            min_percent: Range<0, 1>,
            mid_seconds: number,
            mid_percent: Range<0, 1>,
            max_seconds: number
        }
    }
    export interface Volumetric {
        density?: {
            air?: DensityFogSettings,
            water?: DensityFogSettings,
            lava?: DensityFogSettings,
            lava_resistance?: DensityFogSettings
        },
        media_coefficients?: {
            air?: MediaCoefficient,
            water?: MediaCoefficient,
            cloud?: MediaCoefficient,
        }
    }
    export interface DensityFogSettings {
        max_density: Range<0, 1>,
        max_density_height?: Range<0, 320>,
        zero_density_height?: Range<0, 320>,
        uniform?: boolean
    }
    export interface MediaCoefficient {
        scattering: `#${string}`,
        absorption: `#${string}`,
    }
}