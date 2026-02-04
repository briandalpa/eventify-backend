import { prisma } from '../application/database';
import { LocationResponse, toLocationResponse } from '../model/location-model';

export class LocationService {
  static async listLocations(): Promise<LocationResponse[]> {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    });

    return locations.map((l) => toLocationResponse(l));
  }
}
