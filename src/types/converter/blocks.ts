import { BlockState } from "../java/blockstate";

export interface McDataState {
    name: string;
    type: "bool" | "enum" | "int" | "direction";
    values?: unknown[] | undefined;
    num_values?: number;
}

export interface VariantGroups {
    [key: string]: VariantGroup[];
}

export interface VariantGroup {
    stateStrings: string[] | true;
    model: StateModel | StateModel[];
}

export interface StateModel {
    model: string;
    x?: number;
    y?: number;
    uvlock?: boolean;
    weight?: number;
}

export interface BlockStateWithPath { 
    path: string; 
    state: BlockState; 
}
export interface BlockStateCondition { 
    condition: string | BlockState.Part['when'];
    state: BlockState.State | BlockState.State[]; 
    path: string; 
};

export interface InterimStateMaps { 
    overrides: BlockStateWithPath[], 
    vanilla: Map<string, BlockStateCondition[]> 
}