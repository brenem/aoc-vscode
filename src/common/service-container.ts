import { EventEmitter } from 'events';
import { Container, decorate, injectable, MetadataName, ServiceIdentifier } from 'inversify';
import { IServiceContainer } from './types/service-container';

// This needs to be done once, hence placed in a common location.
// Used by UnitTestSockerServer and also the extension unit tests.
// Place within try..catch, as this can only be done once (it's
// possible another extension would perform this before our extension).
try {
    decorate(injectable(), EventEmitter);
} catch (ex) {
    console.warn(
        'Failed to decorate EventEmitter for DI (possibly already decorated by another Extension)',
        ex
    );
}

@injectable()
export class ServiceContainer implements IServiceContainer {
    constructor(private container: Container) {}

    public get<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        name?: MetadataName
    ): T {
        return name
            ? this.container.get<T>(serviceIdentifier, { name })
            : this.container.get<T>(serviceIdentifier);
    }

    public getAll<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        name?: MetadataName | undefined
    ): T[] {
        return name
            ? this.container.getAll<T>(serviceIdentifier, { name })
            : this.container.getAll<T>(serviceIdentifier);
    }

    public tryGet<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        name?: MetadataName | undefined
    ): T | undefined {
        try {
            return name
                ? this.container.get<T>(serviceIdentifier, { name })
                : this.container.get<T>(serviceIdentifier);
        } catch {
            // This might happen after the container has been destroyed
        }

        return undefined;
    }
}
