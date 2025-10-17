import mongoose, {Schema, Document} from "mongoose";  // importing document bcz of type safety


export interface Message extends Document{   // its the document format of mongoose that will send data in document
    content: string;
    createdAt: Date
}

const MessageSchema: Schema<Message> = new Schema({
    content:{
        type:String,
        required: true
    },
    createdAt:{
        type: Date,
        required: true,
        default: Date.now
    }
})

export interface User extends Document{   // its the document format of mongoose that will send data in document
    UserName: string;
    email: string;
    password:string
    verification:string;
    verifyCodeExpiry: Date;
    isVerified: boolean;
    isAcceptingMessage: boolean;
    messages: Message[]
}

const UserSchema: Schema<User> = new Schema({
    UserName:{
        type:String,
        required: true
    },
    email:{
        type: String,
        required: [true,"Email is required"],
        lowercase: true,
        uppercase: false,
        unique: true,
        match: [/[a-z0-9]+[_a-z0-9\.-]*[a-z0-9]+@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})/,"Please Enter a valid email id"]
    },
    password:{
        type: String,
        required: [true,"Password is required"],
        minLength:[8,"Minimum 8 characters are required"],
        unique: true,
        trim: true
    },
    verification:{
        type: String
    },
    verifyCodeExpiry: {
        type: Date,
        required: [true,"Verification code is required"]
    },
    isVerified:{
        type:Boolean,
        default:false,
        required:[true,"Verify Code expiary is required"]
    },
    isAcceptingMessage: {
        type: Boolean,
        default: true,
    },
    messages:[MessageSchema]
})

const UserModel = (mongoose.models.User as mongoose.Model<User> || mongoose.model<User>("User", UserSchema))

export default UserModel;