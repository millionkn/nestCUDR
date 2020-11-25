// private useFilter(
//   qb: SelectQueryBuilder<any>,
//   pathRef: string,
//   argName: string,
//   filter: Filter<any>,
// ) {
//   const target: Filter<any> = filter;
//   if ('in' in target) {
//     qb.andWhere(`${pathRef} in (:...${argName}_in)`, { [`${argName}_in`]: target.in })
//   }
//   if ('equal' in target) {
//     qb.andWhere(`${pathRef} = :${argName}_equal`, { [`${argName}_equal`]: target.equal })
//   }
//   if ('like' in target) {
//     const likeArr = target.like instanceof Array ? target.like : [target.like];
//     likeArr.forEach((str, index) => {
//       qb.andWhere(`${pathRef} like :${argName}_like_${index}`, { [`${argName}_like_${index}`]: `%${str}%` })
//     })
//   }
//   if ('lessOrEqual' in target && 'moreOrEqual' in target) {
//     qb.andWhere(`${pathRef} between :${argName}_less and :${argName}_more`, {
//       [`${argName}_less`]: target.lessOrEqual,
//       [`${argName}_more`]: target.moreOrEqual,
//     })
//   } else if ('lessOrEqual' in target) {
//     qb.andWhere(`${pathRef} <= :${argName}_less`, {
//       [`${argName}_less`]: target.lessOrEqual,
//     })
//   } else if ('moreOrEqual' in target) {
//     qb.andWhere(`${pathRef} >= :${argName}_more`, {
//       [`${argName}_more`]: target.moreOrEqual,
//     })
//   }
// }