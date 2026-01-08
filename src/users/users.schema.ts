import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { Role } from "src/common/enum/role.enum";

@Schema({ timestamps: true })
export class User{
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true, lowercase: true })
    email: string;

    @Prop({ required: true, select: false })
    password: string;

    @Prop({ enum: Role, required: true })
    role: Role;

    @Prop({ type: Types.ObjectId, ref: 'organizations', default: null })
    organizationId: Types.ObjectId | null;

    @Prop({ default: true })
    isActive: boolean;

    @Prop()
    refreshToken: string;
}

export type UserDocument = User & Document;
export const UsersSchema = SchemaFactory.createForClass(User);
