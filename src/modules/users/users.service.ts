import { HttpException, HttpStatus, Injectable, NotAcceptableException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FriendRequestRepository } from '../friend_request/friend_request.repository';
import { CreateUserSchema, LoginSchema, UpdateUserSchema } from './users.schema';
import { FriendshipRepository } from '../friendship/friendship.repository';
import { JwtPayload, UpdateUser } from 'src/utils/types';
import { CreateUserDto, LoginDto } from './users.dto';
import { UsersRepository } from './users.repository';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    readonly usersRepository: UsersRepository,
    readonly friendRequestRepository: FriendRequestRepository,
    readonly friendshipRepository: FriendshipRepository,
  ) {}

  async create(createUserDto: CreateUserDto) {
    CreateUserSchema.parse(createUserDto);

    const result = await this.usersRepository.checkEmail(createUserDto.email);
    if (result) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          message: 'User already exists!',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const hashedPassword: string = bcrypt.hashSync(createUserDto.password, 10);
    return await this.usersRepository.createNewUser({
      email: createUserDto.email,
      username: createUserDto.username,
      hashedPassword,
    });
  }
  async login(loginDto: LoginDto) {
    LoginSchema.parse(loginDto);

    const user = loginDto.login.includes('@')
      ? await this.usersRepository.checkEmail(loginDto.login)
      : await this.usersRepository.checkUsername(loginDto.login);
    if (!user) throw new UnauthorizedException();

    if (!bcrypt.compareSync(loginDto.password, user.password)) {
      throw new UnauthorizedException();
    }
    const newJwt: JwtPayload = {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      // avatar: user.avatar,
      // banner: user.banner,
    };
    const userData = {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      banner: user.banner,
    };
    return { token: jwt.sign(newJwt, process.env.JWT_SECRET), userData };
  }

  async findAll(id: string) {
    return await this.usersRepository.getUsersList(id);
  }
  async findOne(id: string) {
    const response: any = await this.usersRepository.findUser(id);
    if (!response) throw new NotFoundException();
    const parsedResponse = {
      username: response.username,
      avatar: response.avatar,
      banner: response.banner,
      usersAnimelist: [...response.UserAnimeList],
    };
    return parsedResponse;
  }

  async getStrangersAndFRs(userId: string) {
    try {
      const userFriends = await this.friendshipRepository.getFriendList(userId);
      const userFriendsIds = userFriends.map((user) => {
        if (user.friend_id !== userId) {
          return user.friend_id;
        }
        return user.user_id;
      });
      const strangers = await this.usersRepository.findNewPossibleFriends([...userFriendsIds, userId]);
      const FRs = await this.friendRequestRepository.getFriendRequests(userId);
      const parsedFRs = FRs.map((e) => {
        return {
          friend_request_id: e.friend_request_id,
          requested_id: e.requested_id,
          requester: {
            user_id: e.requester.user_id,
            username: e.requester.username,
            avatar: e.requester.avatar,
          },
        };
      });

      return { strangers: [...strangers], friendRequests: [...parsedFRs] };
    } catch (error) {
      throw new NotAcceptableException();
    }
  }

  async update(updateUserDto: UpdateUser) {
    UpdateUserSchema.parse(updateUserDto);
    if (updateUserDto.newPassword) {
      const newHashedPassword = bcrypt.hashSync(updateUserDto.newPassword, 10);
      updateUserDto.newPassword = newHashedPassword;
    }
    const updateUserObject = {
      user_id: updateUserDto.user_id,
      ...(updateUserDto.avatar && { avatar: Buffer.from(updateUserDto.avatar, 'base64') }),
      ...(updateUserDto.banner && { banner: Buffer.from(updateUserDto.banner, 'base64') }),
      ...(updateUserDto.username && { username: updateUserDto.username }),
      ...(updateUserDto.newPassword && { password: updateUserDto.newPassword }),
    };
    const response = await this.usersRepository.updateUser(updateUserObject);
    const parsedResponse = {
      user_id: response.user_id,
      email: response.email,
      username: response.username,
      avatar: response.avatar,
      banner: response.banner,
    };
    return parsedResponse;
  }
  async remove(id: string) {
    return await this.usersRepository.deleteAccount(id);
  }
}
