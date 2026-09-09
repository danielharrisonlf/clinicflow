import { Injectable } from "@nestjs/common";
import { AvailabilityService } from "../availability.service";
import { TimeSlotDto } from "../dto/appointment-response.dto";
import { ListSlotsQueryRequest } from "../requests/list-slots.request";

@Injectable()
export class ListSlotsService {
  constructor(private readonly availabilityService: AvailabilityService) {}

  execute(query: ListSlotsQueryRequest): Promise<TimeSlotDto[]> {
    return this.availabilityService.listSlots(query);
  }
}
