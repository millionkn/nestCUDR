# 特性

项目使用typeorm，通过定义实体类(Entity)生成对应数据库的表

## 自动生成实体对应表
在`src/repository/repository.module.ts`中将`synchronize: false`改为`synchronize: true`,已允许typeorm自动根据实体生成对应表。通常情况下选项应为关闭状态，在你确定需要修改表结构时`设置为true并保存`-`自动或手动重启程序`-`设置为false并保存`-`自动或手动重启`

## 实体类必须以Entity结尾
由于一些常用类名,如`User`很容易与其他库的类重名,实体类名必须以`Entity`结尾

# 增删改查

readme中所有示例所用的类定义均为下面代码的定义，表为自动生成

注意，这段代码在实际执行的时候会由于js元数据的标记方式导致产生问题，但作为示例，为了方便阅读起见，没有做处理

```typescript
@Entity()
class BaseEntity{
  @PrimaryGeneratedColumn('uuid')
  id:string//uuid,唯一主键,创建时自动生成
  @Column()
  createDate:Date//在使用json传输时会被序列化为YYYY-MM-DD HH:mm:ss//在创建时可以不填
}

@Entity()
class BlobEntity extends BaseEntity{
  @Column(Blob,{select:false})//特别标记，在查询的时候不会自动加载，使用其他接口进行读取
  blob:Blob//各种二进制文件，例如图像等
}

@Entity()
@CudrEntity()
class NameChangeLogEntity extends BaseEntity{//用户的改名记录
  @ManyToOne(()=>UserEntity)
  @DeepQuery()
  user:UserEntity
  @Column()
  changeTo:string//名字被改成了什么
}

@Entity()
@CudrEntity()
class GroupEntity extends BaseEntity{//群组，类似qq群或微信群
  @Column()
  name:string//组名
  @DeepQuery()
  @ManyToMany(UserEntity,(user)=>user.groups)
  users:UserEntity[]
}


@Entity()
@CudrEntity()
class UserEntity extends BaseEntity{//用户
  @QueryLast()
  @DeepQuery()
  @OneToOne(()=>NameChangeLogEntity,(changeLog)=>changeLog.user)
  lastNameLog:NameChangeLogEntity//最后一次的改名记录
  @DeepQuery()
  @ManyToMany(GroupEntity,(group)=>group.users)
  groups:GroupEntity[]//用户加入的群组
  @DeepQuery()
  @OneToMany(CommentEntity,(comment)=>comment.user)
  comments:Comment[]
}

@Entity()
@CudrEntity()
class CommentEntity extends BaseEntity{//用户评论
  @DeepQuery()
  @ManyToOne(UserEntity)
  user:UserEntity
  @Column()
  content:string//内容
}
```


## 查询

### api入口
以`CommentEntity`为例,查询`CommentEntity`,其中`comment`是由`CommentEntity`的类名去掉`Entity`得来的,请求地址不区分大小写
>`[Post] cudr/comment/findEntityList`



所有被`@CudrEntity`修饰的class都会生成类似的接口

- 普通查询

  requestBody为
  ```js
  {
    where:{
      content:{'':{like:'查找出来的评论包含这段文字'}},
    },
    pageIndex:1, //从1开始，原因是zorro table组件选择页码时是从1开始的
    pageSize:10 //如果此处为0则会仅进行计数而不进行查询
  }
  ```
  其中,`pageIndex`和`pageSize`都是可选的
  - 两个都没有的话会返回所有结果
  - 仅有`pageSize`时`pageIndex`默认为1
  - 仅有`pageIndex`时`pageSize`默认为10
  
  返回值为json
  ```json
  {
    "data":[
      {
        "id":"",//uuid
        "createDate":"2020-01-01 12:20:00",
        "content":"aaa查找出来的评论包含这段文字bbb"
      },
      //...其他两条类似的结果
    ],
    "total":3//符合条件的记录总数,与pageSize无关
  }
  ```
  如果在进行查询时，除非特别标记，会查询所有被`@Column`修饰的字段(除非明确标记不查询，例如`BlobEntity`的`blob`属性),对于`CommentEntity`来说,除了有自身的`content`,还有继承来的`id`和`createDate`

  当字段的属性对应时,可用的过滤条件分别为:
  - `ID`:{in:['id']}
  - `string`:{like:'str'}
  - `boolean`:{equal:false}
  - `number`:{lessOrEqual:100,moreOrEqual:0}//都是可选的
  - `Date`:{lessOrEqual:'2020-12-30 23:59:59',moreOrEqual:'2020-01-01 00:00:00'}//都是可选的
- 带join的查询
  
  > 被`@DeepQuery`修饰的字段才能进行join操作
  > 功能上,可以任意深度嵌套
  - 多对一 与 一对一查询

    当你需要知道评论的用户信息时，requestBody为
    ```js
    {
      where:{
        content:{'':{like:'查找出来的评论包含这段文字'}},
        user:{}
      }
    }
    ```
    当然`user`中也可以有条件,也可以进一步进行`join`
    ```js
    {
      where:{
        content:{'':{like:'查找出来的评论包含这段文字'}},
        user:{
          id:{'':{in:['userId1','userId2']}}
        }
      }
    }
    ```
    这句话的含义是,查询所有的`comment`,要求他们的`context`中含有`查找出来的评论包含这段文字`,并且
    >`comment.user`为`null` 或者 `comment.user.id`是`userId1`,`userId2`中的一个

    返回值为
    ```json
    {
      "data":[
        {
          "id":"",//uuid
          "createDate":"2020-01-01 12:20:00",
          "content":"aaa查找出来的评论包含这段文字bbb",
          "user":{
            //...user的属性
          }
        },
        {
          "id":"",//uuid
          "createDate":"2020-01-01 12:20:01",
          "content":"aaa查找出来的评论包含这段文字bbb",
          //数据库中这条comment的userId为null,因此查询的结果为user:undefined,在json序列化时会丢弃undefined的key-value,导致json中没有user字段
        },
      ],
      "total":3
    }
    ```
    必须显式请求user的原因是,系统中会存在大量的反向引用,例如`user.comments`和`comment.user`,假设自动加载,会导致查询结果无法序列化:
    ```js
    {
      user:{
        //...
        comments:[
          //...
          {
            user:{//没有尽头
              //...
              //comments:[...]
            }
          }
        ]
      }
    }
    ```
    数据库中为null有时会有特殊的含义,但作为程序这一点无法判断,如果你需要对null进行过滤,可以
    ```js
    {
      where:{
        user:{
          '':{isNull:false},
          id:{'':{in:['userId1','userId2']}}
        }
      }
    }
    ```
    这会选取所有的,`user`不为`null`,并且`comment.id`是其中之一的`comment`
    
    当然你也可以将`isNull`设置为true,这会导致`user`中的其他条件被忽略
    >isNull仅在一对一与多对一中使用
  - 一对多与多对多
    
    两者在查询时与一对一的语法没有太大区别,但需要注意,在某个数组中的过滤条件,仅对对应数组内进行过滤,例如
    `[Post] cudr/user/FindEntityList`
    ```js
    {//requestBody
      where:{
        //...条件A
        comments:{
          content:{'':{like:'aaa'}}
        }
      }
    }
    ```
    返回类似
    ```json
    {
      "total":2
      "data":[
        {
          //...user其他属性
          "comments":[
            {
              //...comment的其他属性
              "content":"aaa"
            }
          ]
        },
        {
          //...user其他属性
          "comments": []//尽管没有符合条件的评论,但并不会影响user的筛选
        },
      ]
    }
    ```
    - 对于这两个`user`一定满足条件A
    - 对于他们所持有的`comment`来说`comment.context`一定含有`aaa`
    - 尽管第二个user没有符合条件的comment,但这一点并不会导致它本身被过滤
    - `total`是`user`的总数量,与`comment`的数量无关
    
    如果你需要过滤掉没有任何符合条件的用户,requestBody为
    ```js
    {
      where:{
        //...条件A
        comments:{
          '':{isEmpty:false},
          content:{'':{like:'aaa'}}
        }
      }
    }
    ```
    >isEmpty仅在一对多和多对多中使用
  - 特殊的一对一,`@QueryLast`

    `NameChangeLogEntity`保存了用户所有的改名记录,但通常只需要最新的一条,这时通过`@QueryLast`修饰,在查询时使用一对一的语法查询最新的一条记录
    例子:
    `[post] cudr/user/findEntityList`
    requestBody为:
    ```js
    {
      where:{
        //...条件
        lastNameLog:{
          //...条件
        }
      }
    }
    ```
    返回值为json
    ```json
    {
      //...
      "data":[
        {
          //...user的其他属性
          "lastNameLog":{
            //...lastNameLog的其他属性
            "changeTo":"最新的名字"
          }
        }
      ]
    }
    ```
  - 排序
    查询结果默认按照`createDate`降序排序,也可以:
    ```js
    {
      where:{
        index1:{'':{'':sortIndex:1}},
        obj:{
          index2:{'':{'':sortIndex:-2}},
        }
      }
    }
    ```
    排序的结果以`index1`升序,之后以`obj.index2`逆序排序

    此外,在一对多和多对一关系中,数组内会单独排序,不会影响数组外