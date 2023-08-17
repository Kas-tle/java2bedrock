import { ItemModel, Model } from "../java/model";
import { Range } from "../util"

export interface ItemEntry {
    item: string;
    bedrock_icon?: string;
    overrides: GeyserPredicate;
    path: string;
    model: ItemModel;
    sprite: boolean;
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