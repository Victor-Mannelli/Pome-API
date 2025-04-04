import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { BadRequestException, Injectable } from '@nestjs/common';
import { FriendRequestService } from './friend_request.service';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway(8080, { namespace: '/friendRequest', cors: true })
export class FriendRequestGateway {
  constructor(readonly friendRequestService: FriendRequestService) {}

  private async sendFriendRequest(userId: string, friendId: string) {
    try {
      return await this.friendRequestService.sendFriendRequests({ userId, friendId });
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  }
  private async deleteFriendRequest(userId: string, friendRequestId: number) {
    try {
      return await this.friendRequestService.deleteFriendRequest(userId, friendRequestId);
    } catch (error) {
      console.error('Error deleting friend request:', error);
    }
  }
  private async acceptFriendRequest(userId: string, friendRequestId: number) {
    try {
      return await this.friendRequestService.acceptFriendRequest(userId, friendRequestId);
    } catch (error) {
      console.error('Error deleting friend request:', error);
    }
  }

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinFrRoom')
  handleJoinRoom(@MessageBody() MessageBody: string, @ConnectedSocket() client: Socket): void {
    // console.log('user entered FR ws');
    client.join(MessageBody);
    client.emit('joinedRoom', MessageBody);
  }

  @SubscribeMessage('leaveFrRoom')
  handleLeaveRoom(@MessageBody() MessageBody: string, @ConnectedSocket() client: Socket): void {
    // console.log('user left FR ws');
    client.leave(MessageBody);
    client.emit('leftRoom', MessageBody);
  }

  @SubscribeMessage('sendFR')
  async handleSendFriendRequest(
    @MessageBody() friendRequestBody: { room: string; user_id: string; friend_id: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const response = await this.sendFriendRequest(friendRequestBody.user_id, friendRequestBody.friend_id);
    const friendRequest = {
      ...response,
      requester: {
        ...response.requester,
        avatar: { data: response.requester.avatar },
      },
    };
    this.server.emit('sendFR', { friendRequest, sender: client.id });
  }

  @SubscribeMessage('deleteFR')
  async handleDeleteFriendRequest(
    @MessageBody() friendRequestBody: { room: string; user_id: string; friendRequestId: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const deletedFR = await this.deleteFriendRequest(friendRequestBody.user_id, friendRequestBody.friendRequestId);
      this.server.emit('deleteFR', { deletedFR, sender: client.id });
    } catch (error) {
      throw new BadRequestException();
    }
  }

  @SubscribeMessage('acceptFR')
  async handleAcceptFriendRequest(
    @MessageBody() friendRequestBody: { room: string; user_id: string; friendRequestId: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const response = await this.acceptFriendRequest(friendRequestBody.user_id, friendRequestBody.friendRequestId);
      const acceptedFR = {
        ...response,
        avatar: { data: response.avatar },
      };
      this.server.emit('acceptFR', { acceptedFR, sender: client.id });
      this.server.emit('deleteFR', { deletedFR: { friend_request_id: friendRequestBody.friendRequestId }, sender: client.id });
    } catch (error) {
      throw new BadRequestException();
    }
  }
}
