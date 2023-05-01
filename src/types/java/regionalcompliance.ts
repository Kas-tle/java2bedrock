export interface RegionalCompliance {
    [key: string]: {
        delay?: number,
        period: number,
        title: string,
        message: string
    }[]
}