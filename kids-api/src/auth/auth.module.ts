import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";
import { UserContextService } from "./user-context.service";

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, UserContextService],
  exports: [TokenService, UserContextService],
})
export class AuthModule {}
