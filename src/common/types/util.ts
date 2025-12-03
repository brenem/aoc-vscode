export interface IDisposable {
    dispose(): void | undefined | Promise<void>;
}

export interface Newable<T> {
    new (...args: any[]): T;
}

export interface Abstract<T> {
    prototype: T;
}

export type ClassType<T> = {
    new (...args: any[]): T;
};
