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
        [key: string]: RootBlock;
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

export class BlockBuilder {
    private block: GeyserMappings.Block = {};

    collisionBox(hitbox: GeyserMappings.Hitbox): this {
        this.block.collision_box = hitbox;
        return this;
    }

    destructibleByMining(value: number): this {
        this.block.destructible_by_mining = value;
        return this;
    }

    displayName(name: string): this {
        this.block.display_name = name;
        return this;
    }

    extendedCollisionBox(hitbox: GeyserMappings.Hitbox): this {
        this.block.extended_collision_box = hitbox;
        return this;
    }

    friction(value: Range<0, 1>): this {
        this.block.friction = value;
        return this;
    }

    geometry(value: { identifier: string; bone_visibility?: { [key: string]: Molang; }; } | string): this {
        this.block.geometry = value;
        return this;
    }

    lightEmission(value: Range<0, 15>): this {
        this.block.light_emission = value;
        return this;
    }

    lightDampening(value: Range<0, 15>): this {
        this.block.light_dampening = value;
        return this;
    }

    materialInstances(instances: { [key: string]: GeyserMappings.MaterialInstance }): this {
        this.block.material_instances = instances;
        return this;
    }

    placementFilter(filter: GeyserMappings.PlacementFilter): this {
        this.block.placement_filter = filter;
        return this;
    }

    selectionBox(hitbox: GeyserMappings.Hitbox): this {
        this.block.selection_box = hitbox;
        return this;
    }

    tags(tagList: string[]): this {
        this.block.tags = tagList;
        return this;
    }

    transformation(value: {
        scale?: Vec3f;
        translation?: Vec3f;
        rotation?: Vec3f;
    }): this {
        this.block.transformation = value;
        return this;
    }

    unitCube(value: boolean): this {
        this.block.unit_cube = value;
        return this;
    }

    append(existingBlock: GeyserMappings.Block): this {
        Object.assign(this.block, existingBlock);
        return this;
    }

    build(): GeyserMappings.Block {
        return this.block;
    }
}

export class RootBlockBuilder extends BlockBuilder {
    private rootBlock: GeyserMappings.RootBlock = { ...super.build(), name: '' };

    name(value: string): this {
        this.rootBlock.name = value;
        return this;
    }

    creativeCategory(value: GeyserMappings.CreativeCategory): this {
        this.rootBlock.creative_category = value;
        return this;
    }

    creativeGroup(value: GeyserMappings.CreativeGroup): this {
        this.rootBlock.creative_group = value;
        return this;
    }

    includedInCreativeInventory(value: boolean): this {
        this.rootBlock.included_in_creative_inventory = value;
        return this;
    }

    onlyOverrideStates(value: boolean): this {
        this.rootBlock.only_override_states = value;
        return this;
    }

    stateOverrides(overrides: { [key: string]: GeyserMappings.Block }): this {
        this.rootBlock.state_overrides = overrides;
        return this;
    }

    placeAir(value: boolean): this {
        this.rootBlock.place_air = value;
        return this;
    }

    append(existingBlock: GeyserMappings.Block): this {
        Object.assign(this.rootBlock, existingBlock);
        return this;
    }

    build(): GeyserMappings.RootBlock {
        return this.rootBlock;
    }
}

export class MaterialInstanceBuilder {
    private materialInstance: GeyserMappings.MaterialInstance = {
        texture: '',
        render_method: "opaque"
    };

    texture(value: string): this {
        this.materialInstance.texture = value;
        return this;
    }

    renderMethod(value: "opaque" | "alpha_test" | "blend" | "double_sided"): this {
        this.materialInstance.render_method = value;
        return this;
    }

    faceDimming(value: boolean): this {
        this.materialInstance.face_dimming = value;
        return this;
    }

    ambientOcclusion(value: boolean): this {
        this.materialInstance.ambient_occlusion = value;
        return this;
    }

    build(): GeyserMappings.MaterialInstance {
        return this.materialInstance;
    }
}