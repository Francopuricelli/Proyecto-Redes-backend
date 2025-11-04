import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(registerDto: RegisterDto): Promise<User> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.contraseña, saltRounds);

    const createdUser = new this.userModel({
      ...registerDto,
      contraseña: hashedPassword,
      fechaNacimiento: new Date(registerDto.fechaNacimiento),
    });

    return createdUser.save();
  }

  async findOne(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-contraseña').exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-contraseña').exec();
  }

  async findByEmail(correo: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ correo }).exec();
  }

  async findByUsername(nombreUsuario: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ nombreUsuario }).exec();
  }

  async findByEmailOrUsername(usuario: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      $or: [
        { correo: usuario },
        { nombreUsuario: usuario }
      ]
    }).exec();
  }

  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.contraseña);
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).select('-contraseña').exec();
  }
}