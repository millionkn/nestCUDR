export class TODOError extends Error { }

export class NoPropertyError extends Error {
  constructor(pathArr: string[]) {
    super(`()->${pathArr.join('->')}不存在`);
  }
}

export class NotEntityError extends Error {
  constructor(pathArr: string[]) {
    super(`()->${pathArr.join('->')}不是一个Entity`);
  }
}

export class PathResolveError extends Error { }

export class EmptyArrayError extends Error { }

export class WrongRelationError extends Error { }