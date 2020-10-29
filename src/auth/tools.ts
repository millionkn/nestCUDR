import { ID } from "src/utils/entity";
import { Type } from "@nestjs/common";
import { Socket } from "socket.io";

export type CurrentUserData = { userId: ID<any> }

export function setSessionCurrentUser(session: Express.Session, data: CurrentUserData) {
  return session.currentUser = data;
}
export function getSessionCurrentUser(session: Express.Session): CurrentUserData | null {
  return session.currentUser || null
}

export const AuthControllerMapSym = Symbol();

export type AuthControllerInfoMap = Map<string, {
  accountKey: string,
  usernameKey: string,
  extraWhere: { [k: string]: any }
  klass: Type<any>,
}>

const socketUserData = new Map();
export function setWsCurrentUser(ws: Socket, data: CurrentUserData) {
  socketUserData.set(ws.id, data);
  ws.on('disconnect', () => {
    socketUserData.delete(ws.id);
  })
  return data;
}
export function getWsCurrentUser(ws: Socket): CurrentUserData | null {
  return socketUserData.get(ws.id) || null;
}