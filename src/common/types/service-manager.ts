import { ServiceIdentifier, Factory, MetadataName, Container } from 'inversify';
import { ClassType, IDisposable } from './util';

export const IServiceManager = Symbol('IServiceManager');

export interface IServiceManager extends IDisposable {
    add<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        constructor: ClassType<T>,
        name?: MetadataName | undefined,
        bindings?: symbol[]
    ): void;

    addSingleton<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        constructor: ClassType<T>,
        name?: MetadataName,
        bindings?: symbol[]
    ): void;

    addSingletonInstance<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        instance: T,
        name?: MetadataName
    ): void;

    // TODO: figure out factory support, FactoryCreator type no longer exists in inversify v7+
    // addFactory<T>(
    //     factoryIdentifier: ServiceIdentifier<Factory<T>>,
    //     factoryMethod: FactoryCreator<T>
    // ): void;

    addSingletonFactory<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        factory: (context: Container) => T,
        name?: MetadataName | undefined
    ): void

    addBinding<T1, T2>(
        from: ServiceIdentifier<T1>,
        to: ServiceIdentifier<T2>
    ): void;

    get<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        name?: MetadataName
    ): T;

    tryGet<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        name?: MetadataName
    ): T | undefined;

    getAll<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        name?: MetadataName
    ): T[];

    rebind<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        constructor: ClassType<T>,
        name?: MetadataName
    ): void;

    rebindSingleton<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        constructor: ClassType<T>,
        name?: MetadataName
    ): void;

    rebindInstance<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        instance: T,
        name?: MetadataName
    ): void;
}
