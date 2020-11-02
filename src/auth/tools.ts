import { Socket } from "socket.io";
import { ID } from "src/utils/entity";
import { AuthError } from "./errors";

const socketData = new Map<string, any>();

export async function setLoginState(target: Socket | Express.Session, id: ID, dataOrFun?: any) {
  let data: any;
  if (dataOrFun === undefined) {
    data = {};
  } else if (typeof dataOrFun === 'function') {
    data = await dataOrFun(id)
  } else {
    data = dataOrFun;
  }
  if ('cookie' in target) {
    target.currentUserState = {
      id,
      data,
    }
  } else if ('client' in target) {
    socketData.set(target.id, { id, data });
    target.on('disconnect', () => {
      socketData.delete(target.id);
    });
  } else {
    throw new Error(`无效的登录对象`);
  }
}

export async function getLoginState(target: Socket | Express.Session | undefined) {
  let ret: { id: ID, data: any } | undefined;
  if (target) {
    if ('cookie' in target) {
      ret = target.currentUserState;
    } else if ('client' in target) {
      ret = socketData.get(target.id);
    } else {
      throw new Error(`无效的登录对象`);
    }
  }
  if (!ret) { throw new AuthError('尚未登录'); }
  return ret;
}