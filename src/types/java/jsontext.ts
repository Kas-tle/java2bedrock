export type JSONText = Content.Text 
    | Content.Translate 
    | Content.Score 
    | Content.Selector 
    | Content.Keybind 
    | Content.NBT

export namespace Content {
    export interface Base {
        extra?: JSONText[],
        color?: `#${string}`
            | 'black'
            | 'dark_blue'
            | 'dark_green'
            | 'dark_aqua'
            | 'dark_red'
            | 'dark_purple'
            | 'gold'
            | 'gray'
            | 'dark_gray'
            | 'blue'
            | 'green'
            | 'aqua'
            | 'red'
            | 'light_purple'
            | 'yellow'
            | 'white',
        font?: string,
        bold?: boolean,
        italic?: boolean,
        underlined?: boolean,
        strikethrough?: boolean,
        obfuscated?: boolean,
        insertion?: string,
        clickEvent?: {
            action: 'open_url' 
                | 'open_file' 
                | 'run_command' 
                | 'suggest_command' 
                | 'change_page',
            value: string
        },
        hoverEvent?: {
            action: 'show_text' 
                | 'show_item' 
                | 'show_entity',
            contents: JSONText | Item | Entity,
            value?: string
        }
    }
    export interface Item extends Base {
        id?: string,
        count?: number,
        tag?: string
    }
    export interface Entity extends Base {
        name?: JSONText,
        type?: string,
        id?: string
    }
    export interface Text extends Base {
        text: string
    }
    export interface Translate extends Base {
        translate: string,
        with?: JSONText[]
    }
    export interface Score extends Base {
        score: {
            name: string,
            objective: string,
            value?: string
        }
    }
    export interface Selector extends Base {
        selector: string,
        separator?: JSONText,
    }
    export interface Keybind extends Base {
        keybind: string
    }
    export interface NBT extends Base {
        nbt: string,
        block?: string,
        entity?: string,
        storage?: string
        interpret?: boolean,
        separator?: JSONText
    }
}