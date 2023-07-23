export interface Mappings {
    textureMappings: {
        nested: Texture.Mappings;
        root: Texture.RootMappings;
    };
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