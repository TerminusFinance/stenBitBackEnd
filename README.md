# Backend from terminus apps

### The technologies used:

- ts
- express
- axios
- mysql2

### Project navigation:

- src/auth - methods from request authentication
- src/controllers - methods for control operation work
- src/routes - methods for route the api
- scr/service - methods for work
- scr/tonWork - methods for works remote api
- scr/types - methods for typezation

### To start the server, you need to create a param.env file in the root of the project where you specify the following parameters:

- MY_SECRET_TOKEN (from telegram bot)
- user (from Mysql)
- password (from Mysql)
- database (from Mysql)

## Documentation method api:

- `/api/users`
  - `/createNewUsers`
      - **Method:** POST
      - **Description:** Create a new users.
      - **Parameters:**
          - `address` 
      - **Authentication:**
          - `authMiddleware` 
      - **Responses:**
          - `200 OK`: Created users.
          - `400 Bad Request`: Error.

  - `/getUser`
      - **Method:** GET
      - **Description:** Get a users.
      - **Parameters:**
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: requested by the user.
          - `400 Bad Request`: Error.
    
  - `/addCoins`
      - **Method:** POST
      - **Description:** Add coins to users.
      - **Parameters:**
        - `coins` 
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Result operation.
          - `400 Bad Request`: Error.

  - `/processInvitation`
      - **Method:** POST
      - **Description:** Create a new users from invite code.
      - **Parameters:**
          - `inviteCode`
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Created users.
          - `400 Bad Request`: Error.

  - `/updateBoost`
      - **Method:** POST
      - **Description:** Update boost for the users.
      - **Parameters:**
          - `boostName`
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Result operation.
          - `400 Bad Request`: Error.


- `/api/leagues`
    - `/`
        - **Method:** GET
        - **Description:** Get league levels.
        - **Parameters:**
        - **Authentication:**
        - **Responses:**
            - `200 OK`: League levels.
            - `400 Bad Request`: Error.

  - `/getUsersByLvl`
      - **Method:** POST
      - **Description:** Get users by league levels.
      - **Parameters:**
        - `levels` 
      - **Authentication:**
      - **Responses:**
          - `200 OK`: League levels sorted.
          - `400 Bad Request`: Error.



- `/api/task`
    - `/createTask`
        - **Method:** POST
        - **Description:** Create a new task.
        - **Parameters:**
          - `text`
          - `coins`
          - `checkIcon`
          - `taskType`
          - `type`
        - **Authentication:**
          - `authFromCode`
        - **Responses:**
            - `200 OK`: Created task.
            - `400 Bad Request`: Error.

    - `/updateTaskCompletion`
        - **Method:** PATCH
        - **Description:** Update task completion.
        - **Parameters:**
            - `taskId`
            - `completed`
        - **Authentication:**
            - `authMiddleware`
        - **Responses:**
            - `200 OK`: Update result.
            - `400 Bad Request`: Error.

  - `/getAllTasks`
      - **Method:** GET
      - **Description:** Get all task.
      - **Parameters:**
      - **Authentication:**
      - **Responses:**
          - `200 OK`: All task.
          - `400 Bad Request`: Error.

  - `/updateTask`
      - **Method:** POST
      - **Description:** Update a task.
      - **Parameters:**
          - `taskId`
          - `updatedFields`
      - **Authentication:**
          - `authFromCode`
      - **Responses:**
          - `200 OK`: Updated task.
          - `400 Bad Request`: Error.

  - `/deleteTask`
      - **Method:** DELETE
      - **Description:** Delete a task.
      - **Parameters:**
          - `taskId`
      - **Authentication:**
          - `authFromCode`
      - **Responses:**
          - `200 OK`: Message of success operation delete.
          - `400 Bad Request`: Error.

  - `/checkSuccessTask`
      - **Method:** POST
      - **Description:** Check success task from the users.
      - **Parameters:**
          - `taskId`
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.


- `/api/prem`
    - `/getListSubscriptionOptions`
        - **Method:** GET
        - **Description:** Get List Subscription Options.
        - **Parameters:**
        - **Authentication:**
            - `authMiddleware`
        - **Responses:**
            - `200 OK`: List Subscription Options.
            - `400 Bad Request`: Error.

  - `/buyPremium`
      - **Method:** POST
      - **Description:** Buy premium(createInvoiceLink from payment info).
      - **Parameters:**
        - `selectedSubscriptionOptions` 
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/subscriptionProcessing`
      - **Method:** POST
      - **Description:** Subscription Processing buying.
      - **Parameters:**
          - `providerPaymentChargeId`
          - `totalAmount`
      - **Authentication:**
          - `authFromCode`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/getAllPremiumUsers`
      - **Method:** GET
      - **Description:** Get All Premium Users.
      - **Parameters:**
      - **Authentication:**
          - `authFromCode`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/getPremiumUsers`
      - **Method:** GET
      - **Description:** Get Premium Users.
      - **Parameters:**
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.


- `/api/clan`
    - `/getListSubscriptionOptions`
        - **Method:** GET
        - **Description:** Get List Subscription Options.
        - **Parameters:**
        - **Authentication:**
            - `authMiddleware`
        - **Responses:**
            - `200 OK`: List Subscription Options.
            - `400 Bad Request`: Error.

  - `/getAllClans`
      - **Method:** GET
      - **Description:** Get All Clans.
      - **Parameters:**
      - **Authentication:**
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/getUserClan`
      - **Method:** GET
      - **Description:** Get User Clan.
      - **Parameters:**
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/addUserToClan`
      - **Method:** POST
      - **Description:** Add User To Clan.
      - **Parameters:**
        - `clanId`
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/getClanWithUsers`
      - **Method:** POST
      - **Description:** Get Clan With Users.
      - **Parameters:**
          - `clanId`
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/createClan`
      - **Method:** POST
      - **Description:** Create a new Clan.
      - **Parameters:**
          - `clanName`
          - `descriptions`
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.
        
  - `/getClansByLeagueLevels`
      - **Method:** POST
      - **Description:** Get Clans By League Levels.
      - **Parameters:**
          - `levels`
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/leaveClan`
      - **Method:** DELETE
      - **Description:** Leave user from clan.
      - **Parameters:**
      - **Authentication:**
          - `authMiddleware`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.


- `/api/adm`
    - `/getListAllUsers`
        - **Method:** GET
        - **Description:** Get List All Users.
        - **Parameters:**
        - **Authentication:**
            - `authFromCode`
        - **Responses:**
            - `200 OK`: Operation result.
            - `400 Bad Request`: Error.

  - `/deleteUser`
      - **Method:** DELETE
      - **Description:** Delete User.
      - **Parameters:**
        - `userId` 
      - **Authentication:**
          - `authFromCode`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/updateUser`
      - **Method:** POST
      - **Description:** Update User.
      - **Parameters:**
        - `userId`
        - `updatedData`
      - **Authentication:**
          - `authFromCode`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.

  - `/uploadImage`
      - **Method:** POST
      - **Description:** Upload Image to server.
      - **Parameters:**
        - `image` 
      - **Authentication:**
          - `authFromCode`
      - **Responses:**
          - `200 OK`: Operation result.
          - `400 Bad Request`: Error.


- `/api/img/:filename`
  - **Method:** GET
  - **Description:** Get uploaded image.
  - **Parameters:**
  - **Authentication:**
  - **Responses:**
    - `200 OK`: Operation result.
    - `400 Bad Request`: Error.


- `/api/manifest`
    - **Method:** GET
    - **Description:** Get manifest.
    - **Parameters:**
    - **Authentication:**
    - **Responses:**
        - `200 OK`: Operation result.
        - `400 Bad Request`: Error.
