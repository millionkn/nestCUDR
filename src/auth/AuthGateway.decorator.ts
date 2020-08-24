import { Type } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SocketMapSession } from 'src/socket-map-session';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';

function notDelete(x: any) { }

export function AuthGateway() {
  return (klass: Type<any>) => {
    const subklassName = `${Math.random()}`.replace('0.', 'Gateway');
    class Gateway extends klass implements OnGatewayConnection, OnGatewayDisconnect {
      async handleConnection(client: Socket) {
        const token = await SocketMapSession.createToken(client)
        await new Promise((res) => client.emit('auth', token, res));
        const handler = super.handleConnection || function () { };
        return await handler.call(this, client);
      }
      async handleDisconnect(client: Socket) {
        const handler = super.handleDisconnect || function () { };
        try {
          return await handler.call(this, client);
        } catch (e) {
          throw e
        } finally {
          SocketMapSession.unbind(client);
        }
      }
    }
    notDelete(Gateway);
    return eval(`class ${subklassName} extends Gateway{};${subklassName}`);
  }
}