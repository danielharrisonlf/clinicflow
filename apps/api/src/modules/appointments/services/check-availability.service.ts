import { Injectable } from "@nestjs/common";
import { AvailabilityService } from "../availability.service";
import { AvailabilityResultDto } from "../dto/appointment-response.dto";
import { CheckAvailabilityRequest } from "../requests/check-availability.request";

@Injectable()
export class CheckAvailabilityService {
  constructor(private readonly availabilityService: AvailabilityService) {}

  execute(dto: CheckAvailabilityRequest): Promise<AvailabilityResultDto> {
    return this.availabilityService.check(dto);
  }
}
