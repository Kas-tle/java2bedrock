import { Molang, Range, Vec3f } from "../util";

export interface GeyserMappings {
    format_version: "1";
    items?: GeyserMappings.Items;
    blocks?: GeyserMappings.Blocks;
}

export namespace GeyserMappings {
    export interface Items {
        [key: string]: Item[];
    }
    export interface Item {
        name: string;
        allow_off_hand?: boolean;
        icon?: string;
        custom_model_data?: number;
        damage_predicate?: number;
        unbreakable?: boolean;
        render_offsets?: RenderOffsets;
    }
    export interface RenderOffsets {
        main_hand? : {
            first_person?: RenderOffset;
            third_person?: RenderOffset;
        };
        off_hand? : {
            first_person?: RenderOffset;
            third_person?: RenderOffset;
        };
    }
    export interface RenderOffset {
        position?: RenderOffsetPosition;
        rotation?: RenderOffsetPosition;
        scale?: RenderOffsetPosition;
    }
    export interface RenderOffsetPosition {
        x?: number;
        y?: number;
        z?: number;
    }
    export interface Blocks {
        [key: string]: RootBlock[];
    }
    export interface Block {
        collision_box?: Hitbox;
        destructible_by_mining?: number;
        display_name?: string;
        extended_collision_box?: Hitbox;
        friction?: Range<0, 1>;
        geometry?: {
            identifier: string;
            bone_visibility?: {
                [key: string]: Molang;
            };
        } | string;
        light_emission?: Range<0, 15>;
        light_dampening?: Range<0, 15>;
        material_instances?: {
            [key: string]: MaterialInstance;
        };
        placement_filter?: PlacementFilter;
        selection_box?: Hitbox;
        tags?: string[];
        transformation?: {
            scale?: Vec3f;
            translation?: Vec3f;
            rotation?: Vec3f;
        };
        unit_cube?: boolean;
    }
    export interface RootBlock extends Block {
        name: string;
        creative_category?: CreativeCategory;
        creative_group?: CreativeGroup;
        included_in_creative_inventory?: boolean;
        only_override_states?: boolean;
        state_overrides?: {
            [key: string]: Block;
        };
        place_air?: boolean;
    }
    export interface MaterialInstance {
        texture: string;
        render_method: "opaque" | "alpha_test" | "blend" | "double_sided";
        face_dimming?: boolean;
        ambient_occlusion?: boolean;
    }
    export interface PlacementFilter {
        conditions: {
            allowed_faces: string[];
            block_filter: {
                tags: Molang;
                name: string;
                states: {
                    [key: string]: string;
                };
            } | string[];
        }[];
    }
    export interface Hitbox {
        origin: Vec3f;
        size: Vec3f;
    }
    export type CreativeCategory = 
        "itemGroup.name.anvil" |
        "itemGroup.name.arrow" |
        "itemGroup.name.axe" |
        "itemGroup.name.banner" |
        "itemGroup.name.banner_pattern" |
        "itemGroup.name.bed" |
        "itemGroup.name.boat" |
        "itemGroup.name.boots" |
        "itemGroup.name.buttons" |
        "itemGroup.name.candles" |
        "itemGroup.name.chalkboard" |
        "itemGroup.name.chest" |
        "itemGroup.name.chestboat" |
        "itemGroup.name.chestplate" |
        "itemGroup.name.concrete" |
        "itemGroup.name.concretePowder" |
        "itemGroup.name.cookedFood" |
        "itemGroup.name.copper" |
        "itemGroup.name.coral" |
        "itemGroup.name.coral_decorations" |
        "itemGroup.name.crop" |
        "itemGroup.name.door" |
        "itemGroup.name.dye" |
        "itemGroup.name.enchantedBook" |
        "itemGroup.name.fence" |
        "itemGroup.name.fenceGate" |
        "itemGroup.name.firework" |
        "itemGroup.name.fireworkStars" |
        "itemGroup.name.flower" |
        "itemGroup.name.glass" |
        "itemGroup.name.glassPane" |
        "itemGroup.name.glazedTerracotta" |
        "itemGroup.name.goatHorn" |
        "itemGroup.name.grass" |
        "itemGroup.name.hanging_sign" |
        "itemGroup.name.helmet" |
        "itemGroup.name.hoe" |
        "itemGroup.name.horseArmor" |
        "itemGroup.name.leaves" |
        "itemGroup.name.leggings" |
        "itemGroup.name.lingeringPotion" |
        "itemGroup.name.log" |
        "itemGroup.name.minecart" |
        "itemGroup.name.miscFood" |
        "itemGroup.name.mobEgg" |
        "itemGroup.name.monsterStoneEgg" |
        "itemGroup.name.mushroom" |
        "itemGroup.name.netherWartBlock" |
        "itemGroup.name.ore" |
        "itemGroup.name.permission" |
        "itemGroup.name.pickaxe" |
        "itemGroup.name.planks" |
        "itemGroup.name.potion" |
        "itemGroup.name.potterySherds" |
        "itemGroup.name.pressurePlate" |
        "itemGroup.name.rail" |
        "itemGroup.name.rawFood" |
        "itemGroup.name.record" |
        "itemGroup.name.sandstone" |
        "itemGroup.name.sapling" |
        "itemGroup.name.sculk" |
        "itemGroup.name.seed" |
        "itemGroup.name.shovel" |
        "itemGroup.name.shulkerBox" |
        "itemGroup.name.sign" |
        "itemGroup.name.skull" |
        "itemGroup.name.slab" |
        "itemGroup.name.smithing_templates" |
        "itemGroup.name.splashPotion" |
        "itemGroup.name.stainedClay" |
        "itemGroup.name.stairs" |
        "itemGroup.name.stone" |
        "itemGroup.name.stoneBrick" |
        "itemGroup.name.sword" |
        "itemGroup.name.trapdoor" |
        "itemGroup.name.walls" |
        "itemGroup.name.wood" |
        "itemGroup.name.wool" |
        "itemGroup.name.woolCarpet";
    export type CreativeGroup = "commands" | "construction" | "equipment" | "items" | "nature" | "none";
}