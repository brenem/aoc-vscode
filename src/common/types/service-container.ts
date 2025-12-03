import { MetadataName, ServiceIdentifier } from 'inversify';

export const IServiceContainer = Symbol('IServiceContainer');

export interface IServiceContainer {
    get<T>(identifier: ServiceIdentifier<T>, name?: MetadataName): T;
    getAll<T>(identifier: ServiceIdentifier<T>, name?: MetadataName): T[];
    tryGet<T>(identifier: ServiceIdentifier<T>, name?: MetadataName): T | undefined;
}
