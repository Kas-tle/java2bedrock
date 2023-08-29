export interface Mappings {
    textureMappings: {
        nested: Texture.Mappings;
        root: Texture.RootMappings;
    };
    itemMappings: {
        icons: Item.Icons;
    };
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