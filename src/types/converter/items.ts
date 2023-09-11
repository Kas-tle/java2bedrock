import { ItemModel, Model } from "../java/model";
import { Range } from "../util"

export interface ItemEntry {
    elementsPath: string;
    displayPath: string;
    texturesPath: string;
    item: string;
    bedrock_icon?: string;
    overrides: GeyserPredicate;
    path: string;
    model: ItemModel;
    sprite: boolean;
    hash: string;
    textureKeyMap: Map<string, string[]>;
    bedrockTexture: string;
}

export class ItemEntryBuilder {
    private _entry: ItemEntry = {
        elementsPath: "",
        displayPath: "",
        texturesPath: "",
        item: "",
        overrides: {},
        path: "",
        model: {},
        sprite: false,
        hash: "",
        textureKeyMap: new Map(),
        bedrockTexture: ""
    };

    elementsPath(value: string) {
        this._entry.elementsPath = value;
        return this;
    }

    displayPath(value: string) {
        this._entry.displayPath = value;
        return this;
    }

    texturesPath(value: string) {
        this._entry.texturesPath = value;
        return this;
    }

    item(value: string) {
        this._entry.item = value;
        return this;
    }

    overrides(value: GeyserPredicate) {
        this._entry.overrides = value;
        return this;
    }

    path(value: string) {
        this._entry.path = value;
        return this;
    }

    model(value: ItemModel) {
        this._entry.model = value;
        return this;
    }

    sprite(value: boolean) {
        this._entry.sprite = value;
        return this;
    }

    hash(value: string) {
        this._entry.hash = value;
        return this;
    }

    textureKeyMap(value: Map<string, string[]>) {
        this._entry.textureKeyMap = value;
        return this;
    }

    bedrockTexture(value: string) {
        this._entry.bedrockTexture = value;
        return this;
    }

    build(): ItemEntry {
        return this._entry;
    }
}

export interface GeyserPredicate extends Model.BasePredicate {
    damage?: number;
    unbreakable?: boolean;
}

export class GeyserPredicateBuilder {
    private _predicate: GeyserPredicate = {};

    angle(value: Range<0, 1>) {
        this._predicate.angle = value;
        return this;
    }

    blocking(value: 0 | 1) {
        this._predicate.blocking = value;
        return this;
    }

    broken(value: 0 | 1) {
        this._predicate.broken = value;
        return this;
    }

    cast(value: 0 | 1) {
        this._predicate.cast = value;
        return this;
    }

    cooldown(value: Range<0, 1>) {
        this._predicate.cooldown = value;
        return this;
    }

    damage(value: number) {
        this._predicate.damage = value;
        return this;
    }

    unbreakable(value: boolean) {
        this._predicate.unbreakable = value;
        return this;
    }

    lefthanded(value: 0 | 1) {
        this._predicate.lefthanded = value;
        return this;
    }

    pull(value: Range<0, 1>) {
        this._predicate.pull = value;
        return this;
    }

    pulling(value: 0 | 1) {
        this._predicate.pulling = value;
        return this;
    }

    charged(value: 0 | 1) {
        this._predicate.charged = value;
        return this;
    }

    firework(value: 0 | 1) {
        this._predicate.firework = value;
        return this;
    }

    throwing(value: 0 | 1) {
        this._predicate.throwing = value;
        return this;
    }

    time(value: Range<0, 1>) {
        this._predicate.time = value;
        return this;
    }

    custom_model_data(value: number) {
        this._predicate.custom_model_data = value;
        return this;
    }

    level(value: Range<0, 1>) {
        this._predicate.level = value;
        return this;
    }

    filled(value: Range<0, 1>) {
        this._predicate.filled = value;
        return this;
    }

    tooting(value: 0 | 1) {
        this._predicate.tooting = value;
        return this;
    }

    trim_type(value: Range<0, 1>) {
        this._predicate.trim_type = value;
        return this;
    }

    brushing(value: Range<0, 1>) {
        this._predicate.brushing = value;
        return this;
    }

    build(): GeyserPredicate {
        return this._predicate;
    }
}