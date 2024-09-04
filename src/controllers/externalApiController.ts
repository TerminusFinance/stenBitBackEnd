import {Connection} from "mysql2/promise";
import {RowDataPacket} from "mysql2";


class ExternalApiController {
    constructor(private db: Connection) {}

    async checkUserStart(token: string, id: string, refId: string) {
        let result = {
            is_member: false,
            from_partner: false
        };

        const queryToken = `SELECT token FROM partners where token = ?`
        const [tokenRows] = await this.db.execute<RowDataPacket[]>(queryToken, [token]);
        console.log(tokenRows)
        if (tokenRows.length > 0) {

            try {

                const userQuery = 'SELECT * FROM users WHERE userId = ? AND coins > 10';
                const [userRows] = await this.db.execute<RowDataPacket[]>(userQuery, [id]);

                if (userRows.length > 0) {
                    result.is_member = true;

                    const partnerQuery = 'SELECT * FROM users WHERE codeToInvite = ?';
                    const [partnerRows] = await this.db.execute<RowDataPacket[]>(partnerQuery, [refId]);

                    if (partnerRows.length > 0) {
                        const partnerUser = partnerRows[0];


                        const inviteQuery = 'SELECT * FROM user_invitations WHERE inviter_id = ? AND invitee_id = ?';
                        const [inviteRows] = await this.db.execute<RowDataPacket[]>(inviteQuery, [partnerUser.userId, id]);

                        if (inviteRows.length > 0) {
                            result.from_partner = true;
                        }
                    }
                }

                return result;
            } catch (error) {
                console.error('Ошибка при проверке пользователя:', error);
                throw new Error('Ошибка при проверке пользователя');
            }

        } else {
            throw new Error(`Token is not valid`);
        }
    }


}


export default ExternalApiController;