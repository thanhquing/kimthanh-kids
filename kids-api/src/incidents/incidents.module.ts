import { Module } from "@nestjs/common";
import { AllergiesController } from "./allergies.controller";
import { AllergiesService } from "./allergies.service";
import { IncidentsController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";

@Module({
  controllers: [IncidentsController, AllergiesController],
  providers: [IncidentsService, AllergiesService],
  exports: [IncidentsService, AllergiesService],
})
export class IncidentsModule {}
