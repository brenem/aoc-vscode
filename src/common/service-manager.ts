import { BindingConstraints, Container, Factory, injectable, MetadataName, ServiceIdentifier } from 'inversify';
import { Abstract, ClassType, Newable } from './types/util';
import { IServiceManager } from './types';

const whenTargetNamedConstraint: (
  name: MetadataName | undefined,
) => (bindingconstraints: BindingConstraints) => boolean =
  (name: MetadataName | undefined) =>
  (bindingconstraints: BindingConstraints): boolean =>
    bindingconstraints.name === name;

@injectable()
export class ServiceManager implements IServiceManager {
    constructor(private container: Container) {}

    add<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        constructor: new (...args: any[]) => T,
        name?: MetadataName | undefined,
        bindings?: symbol[]
    ): void {
        if (name) {
            this.container.bind<T>(serviceIdentifier).to(constructor).when(whenTargetNamedConstraint(name));
        } else {
            this.container.bind<T>(serviceIdentifier).to(constructor);
        }

        if (bindings) {
            bindings.forEach((binding) => {
                this.addBinding(serviceIdentifier, binding);
            });
        }
    }

    // TODO: figure out factory support, FactoryCreator type no longer exists in inversify v7+
    // addFactory<T>(
    //     factoryIdentifier: ServiceIdentifier<Factory<T>>,
    //     factoryMethod: FactoryCreator<T>
    // ): void {
    //     this.container.bind<Factory<T>>(factoryIdentifier).toFactory<T>(factoryMethod);
    // }

    addBinding<T1, T2>(from: ServiceIdentifier<T1>, to: ServiceIdentifier<T2>): void {
        this.container.bind(to).toService(from);
    }

    addSingleton<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        constructor: new (...args: any[]) => T,
        name?: MetadataName | undefined,
        bindings?: symbol[]
    ): void {
        if (name) {
            this.container.bind<T>(serviceIdentifier).to(constructor).inSingletonScope().when(whenTargetNamedConstraint(name));
        } else {
            this.container.bind<T>(serviceIdentifier).to(constructor).inSingletonScope();
        }

        if (bindings) {
            bindings.forEach((binding) => {
                this.addBinding(serviceIdentifier, binding);
            });
        }
    }

    addSingletonInstance<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        instance: T,
        name?: MetadataName | undefined
    ): void {
        if (name) {
            this.container.bind<T>(serviceIdentifier).toConstantValue(instance).when(whenTargetNamedConstraint(name));
        } else {
            this.container.bind<T>(serviceIdentifier).toConstantValue(instance);
        }
    }

    get<T>(serviceIdentifier: ServiceIdentifier<T>, name?: MetadataName | undefined): T {
        return name ? this.container.get<T>(serviceIdentifier, { name }) : this.container.get<T>(serviceIdentifier);
    }

    tryGet<T>(serviceIdentifier: ServiceIdentifier<T>, name?: MetadataName | undefined): T | undefined {
        try {
            return name
                ? this.container.get<T>(serviceIdentifier, { name })
                : this.container.get<T>(serviceIdentifier);
        } catch {
            // This might happen after the container has been destroyed
        }

        return undefined;
    }

    getAll<T>(serviceIdentifier: ServiceIdentifier<T>, name?: MetadataName | undefined): T[] {
        return name
            ? this.container.getAll<T>(serviceIdentifier, { name })
            : this.container.getAll<T>(serviceIdentifier);
    }

    rebind<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        constructor: ClassType<T>,
        name?: MetadataName
    ): void {
        if (name) {
            this.container.rebindSync<T>(serviceIdentifier).to(constructor).when(whenTargetNamedConstraint(name));
        } else {
            this.container.rebindSync<T>(serviceIdentifier).to(constructor);
        }
    }

    rebindSingleton<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        constructor: ClassType<T>,
        name?: MetadataName
    ): void {
        if (name) {
            this.container.rebindSync<T>(serviceIdentifier).to(constructor).inSingletonScope().when(whenTargetNamedConstraint(name));
        } else {
            this.container.rebindSync<T>(serviceIdentifier).to(constructor).inSingletonScope();
        }
    }

    rebindInstance<T>(
        serviceIdentifier: ServiceIdentifier<T>,
        instance: T,
        name?: MetadataName
    ): void {
        if (name) {
            this.container.rebindSync<T>(serviceIdentifier).toConstantValue(instance).when(whenTargetNamedConstraint(name));
        } else {
            this.container.rebindSync<T>(serviceIdentifier).toConstantValue(instance);
        }
    }

    dispose(): void {
        this.container.unbindAll();
        this.container.unload();
    }

}
