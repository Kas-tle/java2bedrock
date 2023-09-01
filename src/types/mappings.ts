export interface Mappings {
    textureMappings: {
        nested: Texture.Mappings;
        root: Texture.RootMappings;
    };
    itemMappings: {
        icons: Item.Icons;
    };
    soundMappings: Sound.Mappings;
}

export namespace Item {
    export interface Icons {
        [key: string]: {
            icon: string;
            frame: number;
        };
    }
}

export interface MovedTexture {
    file: string; 
    path: string
}

export namespace Texture {
    export interface Mappings {
        [key: string]: {[key: string]: string};
    }
    export interface IgnoredMappings {
        [key: string]: string[];
    }
    export interface RootMappings {
        [key: string]: string | null;
    }
}

export namespace Sound {
    export interface Mappings {
        files: {
            [key: string]: string
        };
        identifiers: {
            [key: string]: {
                bedrockPath: string;
                javaPath: string;
                identifier: string;
            }
        };
    }
}