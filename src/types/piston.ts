export namespace Piston {
    export interface Manifest {
        latest: {
            release: string;
            snapshot: string;
        };
        versions: {
            id: string;
            type: string;
            url: string;
            time: string;
            releaseTime: string;
            sha1: string;
            complianceLevel: number;
        }[];
    }
    export interface Version {
        arguments: Version.Arguments;
        assetIndex: Version.AssetIndex;
        assets: string;
        complianceLevel: number;
        downloads: Version.Downloads;
        id: string;
        javaVersion: Version.JavaVersion;
        libraries: Version.Library[];
        logging: Version.Logging;
        mainClass: string;
        minimumLauncherVersion: number;
        releaseTime: string;
        time: string;
        type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
    }
    export interface Assets {
        objects: {
            [path: string]: {
                hash: string;
                size: number;
            }
        };
    }
}

export namespace Version {
    export interface Arguments {
        game: Array<string | ComplexArgument>;
        jvm: Array<string | ComplexArgument>;
    }
    export interface ComplexArgument {
        rules: {
            action: 'allow' | 'deny';
            os?: {
                name: 'windows' | 'osx' | 'linux';
            };
            features: {
                [feature: string]: boolean;
            }
        }[];
        value: string[];
    }
    export interface AssetIndex {
        id: string;
        sha1: string;
        size: number;
        totalSize: number;
        url: string;
    }
    export interface Downloads {
        client: Download;
        client_mappings: Download;
        server: Download;
        server_mappings: Download;
    }
    export interface Download {
        sha1: string;
        size: number;
        url: string;
    }
    export interface LibraryDownload extends Download {
        path: string;
    }
    export interface JavaVersion {
        component: string;
        majorVersion: number;
    }
    export interface Library {
        downloads: {
            artifact: LibraryDownload;
            name: string;
        };
    }
    export interface LoggingDownload extends Download {
        id: string;
    }
    export interface Logging {
        client: {
            argument: string;
            file: LoggingDownload;
            type: string;
        };
    }
}