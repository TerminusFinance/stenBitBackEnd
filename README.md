Documentation:

User: api/users

GetUser: Get - \getUser

Updateusers: Put - \updateUsers body json -

```
{
    "coins": 100000
}
```

Createuser: Post - \createNewUsers body json -

```
{
    "userId": "user5",
    "userName": "Jo Doe",
    "coins": 100,
    "address": "123 Main St"
}
```

Invite from code: post - \processInvitation

```
{
    "inviteCode": "UNIQUE_CODE_A228QFE1N",
    "newUserId": "user3",
    "newUserName": "bobTwosTest"
}
```

get league: get - \leagues

Update boost: post - \updateBoost body json -

```
{
    "userId": "user6",
    "boostName": "energy limit"
}
```

task -

create new task: post - task/createTask

```json
{
    "text": "Ok our Telegram channel",
    "coins": 10002,
    "checkIcon": "",
    "taskType": { "type": "Sample" },
    "type": "challenge"
}
```

update completed task: patch - task/updateTaskCompletion

```json
{
    "userId": "user1",
    "taskId": 1,
    "completed": "1",
}
```

get all task: get - task/getAllTasks

admin control:

auth from admin controll - headers: Authorization  - tma {Your Key}

api/adm/deleteUser - post - body:

```
{
    "userId": "6034629568"
}
```

api/adm/getListAllUsers - get

api/adm/updateUser - post - body:

```
{
    "userId": "1",
    "updatedData": {
        "coins": 100000
    }
}
```