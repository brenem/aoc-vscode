import { MetadataName, ServiceIdentifier } from 'inversify';

export const IServiceProvider = Symbol('IServiceContainer');

export interface IServiceProvider {
    get<T>(identifier: ServiceIdentifier<T>, name?: MetadataName): T;
    getAll<T>(identifier: ServiceIdentifier<T>, name?: MetadataName): T[];
    tryGet<T>(identifier: ServiceIdentifier<T>, name?: MetadataName): T | undefined;
}
