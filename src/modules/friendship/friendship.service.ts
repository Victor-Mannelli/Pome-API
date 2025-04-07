import { FriendshipRepository } from './friendship.repository';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class FriendshipService {
  constructor(readonly friendshipRepository: FriendshipRepository) {}

  async getFriendshipById(id: string) {
    return await this.friendshipRepository.findOne(id);
  }

  async getFriendShipByUserAndFriendId(userId: string, friendId: string) {
    return await this.friendshipRepository.getFriendShipByUserAndFriendId(userId, friendId);
  }

  async getFriendList(userId: string) {
    const response = await this.friendshipRepository.getFriendList(userId);
    const parsedResponse = response.map((e) => {
      return {
        friendship_id: e.friendship_id,
        user_id: e.friend_id === userId ? e.user_id : e.friend_id,
        username: e.friend_id === userId ? e.user.username : e.friend.username,
        avatar: e.friend_id === userId ? e.user.avatar : e.friend.avatar,
      };
    });
    return parsedResponse;
  }

  async removeFriend({ friend_id, user_id }: { friend_id: string; user_id: string }) {
    const friendship = await this.getFriendShipByUserAndFriendId(user_id, friend_id);
    if (!friendship) throw new NotFoundException();
    if (friendship.friend_id !== user_id && friendship.user_id !== user_id) {
      throw new UnauthorizedException();
    }

    return await this.friendshipRepository.delete(friendship.friendship_id);
  }
}
