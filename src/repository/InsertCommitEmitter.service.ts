import { Injectable, Inject, OnModuleInit, Type } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { Connection, InsertEvent, EntitySubscriberInterface, EntityManager } from "typeorm";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { TransactionCommitEvent } from "typeorm/subscriber/event/TransactionCommitEvent";

@Injectable()
export class InsertCommitEmitterService implements OnModuleInit, EntitySubscriberInterface<any> {
  private sym = Symbol();
  constructor(
    @InjectConnection() private connection: Connection,
    @Inject(DiscoveryService) private discoveryService: DiscoveryService,
    @Inject(MetadataScanner) private metadataScanner: MetadataScanner,
    @Inject(Reflector) private readonly reflector: Reflector
  ) {
    connection.subscribers.push(this);
  }
  onModuleInit() {
    [
      ...this.discoveryService.getControllers(),
      ...this.discoveryService.getProviders(),
    ].forEach(({ instance }) => {
      if (!instance || !Object.getPrototypeOf(instance)) { return; }
      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (key: string) => this.lookupHandlers(instance, key),
      );
    });
  }
  private getHandlers(manager: EntityManager): Array<() => void> {
    (manager as any)[this.sym] = (manager as any)[this.sym] || [];
    return (manager as any)[this.sym];
  }
  private lookupHandlers(instance: Record<string, Function>, key: string) {
    const methodRef = instance[key];
    const targetType: undefined | Type<any> = this.reflector.get(`subscribeInsertCommit`, methodRef);
    if (!targetType) { return; }
    this.connection.subscribers.push({
      listenTo: () => targetType,
      afterInsert: (event: InsertEvent<any>) => {
        this.getHandlers(event.manager).push(() => methodRef.call(instance, event));
      }
    })
  }
  afterTransactionCommit(event: TransactionCommitEvent) {
    const callbacks: Array<() => void> = (event.manager as any)[this.sym];
    callbacks.forEach(cb => cb());
  }
}