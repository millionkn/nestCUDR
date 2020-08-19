import { Socket } from "socket.io";
import { sessionStore } from "src/sessionStore";

const socketStoreSession = new Map<string, string>()
const tokenStoreSocket = new Map<string, string>();

export namespace SocketMapSession {
  export async function getSession(socket: Socket) {
    const sessionId = socketStoreSession.get(socket.id);
    if (!sessionId) { return null }
    const data: Express.SessionData | null | undefined = await new Promise((res, rej) => sessionStore.get(sessionId, (err, data) => err ? rej(err) : res(data)));
    if (!data) { return null }
    return data;
  }
  export async function bindToken(session: Express.Session, body: { token: string }) {
    const socketId = tokenStoreSocket.get(body.token);
    if (!socketId) { return null }
    socketStoreSession.set(socketId, session.id);
    return true;
  }
  export async function createToken(socket: Socket) {
    const token = `#${Math.random()}${Math.random()}${Math.random()}`
    tokenStoreSocket.set(token, socket.id);
    return { token };
  }
}