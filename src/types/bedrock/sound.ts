import { Range } from "../util"

export interface Sounds {
    block_sounds?: {
        [identifier: string]: Sounds.Sound
    },
    entity_sounds?: {
        [identifier: string]: Sounds.Sound
    },
    individual_event_sounds?: {
        [identifier: string]: Sounds.Sound
    },
    interactive_sounds?: {
        [identifier: string]: Sounds.Sound
    }
}

export namespace Sounds {
    export interface Sound {
        events: {
            [identifier: string]: Event | string
        },
        pitch?: Range<0, 1> | [Range<0, 1>, Range<0, 1>]
        volume?: Range<0, 1> | [Range<0, 1>, Range<0, 1>]
    }
    export interface Event {
        sound: string,
        volume?: Range<0, 1> | [Range<0, 1>, Range<0, 1>]
        pitch?: Range<0, 1> | [Range<0, 1>, Range<0, 1>]
    }
}

export interface SoundDefinitions {
    format_version: string,
    sound_definitions: {
        [identifier: string]: SoundDefinitions.Definition
    }
}

export namespace SoundDefinitions {
    export interface Definition {
        category: string,
        __use_legacy_max_distance?: "true" | "false",
        max_distance?: number,
        sounds: Array<string | Sound>
    }
    export interface Sound {
        name: string,
        is3D?: boolean,
        volume?: Range<0, 1>,
        weight?: number
        load_on_low_memory?: boolean
    }
}

export interface MusicDefinitions {
    [identifier: string]: {
        event_name: string,
        min_delay: number,
        max_delay: number
    }
}