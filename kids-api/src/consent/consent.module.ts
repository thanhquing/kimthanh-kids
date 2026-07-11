import { Global, Module } from "@nestjs/common";
import { ConsentController } from "./consent.controller";
import { ConsentService } from "./consent.service";

@Global()
@Module({
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
