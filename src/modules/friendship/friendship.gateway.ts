import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { FriendshipService } from './friendship.service';

@Injectable()
@WebSocketGateway(8080, { namespace: '/friendship', cors: true })
export class FriendShipGateway {
  constructor(readonly friendShipService: FriendshipService) {}

  private async deleteFriend(userId: string, friendId: string) {
    try {
      return await this.friendShipService.removeFriend({ user_id: userId, friend_id: friendId });
    } catch (error) {
      console.error('Error deleting friend:', error);
    }
  }

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('deleteFriend')
  async handleDeleteFriend(
    @MessageBody() deleteFriendBody: { room: string; user_id: string; friend_id: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const response = await this.deleteFriend(deleteFriendBody.user_id, deleteFriendBody.friend_id);
    console.log('response from deleteFriend', response);

    client.emit('deleteFriend', { ...response, room: deleteFriendBody.room, sender: client.id });
  }
}
