import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { comparePasswords } from '../common/utils/password.util';
import { Role } from '../common/enum/role.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

 async login(email: string, password: string) {
  try {
    const user = await this.usersService.getByEmailwithPassword(email);
    if(!user){
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await comparePasswords(password, user.password);
    if(!isMatch){
      throw new UnauthorizedException('Invalid credentials');
    }

     if (
      user.role !== Role.SUPER_ADMIN &&
      !user.organizationId
    ) {
      throw new ForbiddenException('User not assigned to organization');
    }

    const payload = { sub: user._id, email: user.email, role: user.role, orgId: user.organizationId };

    const accessToken = this.jwtService.sign(payload,
      {
        secret: this.config.get('jwt.access.secret'),
      expiresIn: this.config.get('jwt.access.expiresIn'),
      }
    );
const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.refresh.secret'),
      expiresIn: this.config.get('jwt.refresh.expiresIn'),
    });
    await this.usersService.updateRefreshToken(user._id.toString(), refreshToken);
    return { accessToken, refreshToken,
      user: {
        id: user._id,
        role: user.role,
        orgId: user.organizationId,
        email: user.email,
        name: user.name
      }
     };
  } catch (error) {
    return error;
  }
 }

 async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.config.get('jwt.refresh.secret'),
      });
      const user = await this.usersService.getById(decoded.sub);
      if(!user || user.refreshToken !== refreshToken){
        throw new UnauthorizedException();
      }
      const payload = { sub: user._id, email: user.email, role: user.role, orgId: user.organizationId };

const newAccessToken = this.jwtService.sign(payload, {
        secret: this.config.get('jwt.access.secret'),
        expiresIn: this.config.get('jwt.access.expiresIn'),
      });

      const newRefreshToken = this.jwtService.sign(payload, {
        secret: this.config.get('jwt.refresh.secret'),
        expiresIn: this.config.get('jwt.refresh.expiresIn'),
      });

      await this.usersService.updateRefreshToken(user._id.toString(), newRefreshToken);
      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
