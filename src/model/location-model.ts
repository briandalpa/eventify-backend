import { Location } from '../generated/prisma/client';

export type LocationResponse = {
  id: string;
  name: string;
};

export function toLocationResponse(location: Location): LocationResponse {
  return {
    id: location.id,
    name: location.name,
  };
}
